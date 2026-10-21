export const LEVELS = [
  { value: 0, label: 'گروه' },
  { value: 1, label: 'کل' },
  { value: 2, label: 'معین' },
  { value: 3, label: 'تفصیلی ۴' },
  { value: 4, label: 'تفصیلی ۵' },
  { value: 5, label: 'تفصیلی ۶' },
];

export const LEVEL_LABEL = Object.fromEntries(LEVELS.map((level) => [level.value, level.label]));

export const AMOUNT_KEYS = [
  'debit', 'credit', 'balance_debit', 'balance_credit',
  'opening_balance_debit', 'opening_balance_credit',
  'closing_balance_debit', 'closing_balance_credit',
];

export const isAuxKind = (kind) => String(kind || '').startsWith('aux');

export const norm = (value) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/\s/g, '')
  .toLowerCase();

export const nodeKey = (node, prefix = '') => `${prefix}/${node.kind || 'node'}-${node.id}`;

/** درخت API را یک‌بار تخت می‌کند و والدهای هر گره را روی خودش نگه می‌دارد. */
export const flattenTree = (tree) => {
  const flat = [];
  const byKey = new Map();
  const walk = (nodes, parents, prefix) => (nodes || []).map((raw) => {
    const node = { ...raw, __parents: parents, __key: nodeKey(raw, prefix) };
    flat.push(node);
    byKey.set(node.__key, node);
    node.children = walk(raw.children, [...parents, node], node.__key);
    return node;
  });
  walk(tree || [], [], '');
  return { flat, byKey };
};

export const pathLabel = (node, includeSelf = false) => {
  const chain = includeSelf ? [...(node.__parents || []), node] : [...(node.__parents || [])];
  return chain.map((item) => item.name).filter(Boolean).join(' / ');
};

const emptyTotals = () => Object.fromEntries(AMOUNT_KEYS.map((key) => [key, 0]));

const addAmounts = (target, source) => {
  AMOUNT_KEYS.forEach((key) => {
    target[key] += Number(source?.[key] || 0);
  });
};

const descendantsAt = (node, level) => {
  const out = [];
  const walk = (current) => (current.children || []).forEach((child) => {
    if (Number(child.level) === Number(level)) out.push(child);
    walk(child);
  });
  walk(node);
  return out;
};

const ancestorAt = (node, level) => [...(node.__parents || [])]
  .reverse()
  .find((parent) => Number(parent.level) === Number(level));

/**
 * ردیف‌های یک سطح در دامنهٔ انتخابی.
 * اگر دامنه چند «مسیر» از یک طرف حساب باشد، مبالغ در سطح بالاتر بر اساس
 * همان مسیرها تجمیع می‌شوند؛ نه کل حساب.
 */
export const scopeRows = (flat, focusOccurrences, level) => {
  const targetLevel = Number(level);
  const buckets = new Map();

  const add = (node, source) => {
    let row = buckets.get(node.__key);
    if (!row) {
      row = {
        key: node.__key,
        node,
        code: node.code,
        name: node.name,
        kind: node.kind,
        level: targetLevel,
        path: node.__parents || [],
        pathText: pathLabel(node),
        sources: [],
        ...emptyTotals(),
      };
      buckets.set(node.__key, row);
    }
    addAmounts(row, source);
    row.sources.push(source);
  };

  if (!focusOccurrences || !focusOccurrences.length) {
    flat
      .filter((node) => Number(node.level) === targetLevel)
      .forEach((node) => add(node, node));
  } else {
    focusOccurrences.forEach((occurrence) => {
      const occurrenceLevel = Number(occurrence.level);
      if (occurrenceLevel === targetLevel) {
        add(occurrence, occurrence);
      } else if (occurrenceLevel < targetLevel) {
        descendantsAt(occurrence, targetLevel).forEach((child) => add(child, child));
      } else {
        const ancestor = ancestorAt(occurrence, targetLevel);
        if (ancestor) add(ancestor, occurrence);
      }
    });
  }

  return [...buckets.values()].sort((a, b) => (
    String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true })
    || String(a.pathText ?? '').localeCompare(String(b.pathText ?? ''))
  ));
};


/**
 * فهرست یکتای گره‌ها برای جستجو. یک طرف حساب که در چند حساب/مسیر استفاده شده
 * یک نتیجه است، ولی تعداد معین/کل/مسیرهای درگیر را نگه می‌دارد.
 */
export const buildCatalog = (flat) => {
  const groups = new Map();
  flat.forEach((node) => {
    const key = isAuxKind(node.kind) ? `aux-${node.id}` : `${node.kind}-${node.id}`;
    let entry = groups.get(key);
    if (!entry) {
      entry = {
        key,
        id: node.id,
        kind: node.kind,
        code: node.code,
        name: node.name,
        level: node.level,
        occurrences: [],
        levels: new Set(),
      };
      groups.set(key, entry);
    }
    entry.occurrences.push(node);
    entry.levels.add(Number(node.level));
  });

  return [...groups.values()].map((entry) => {
    const levelSets = LEVELS.map(() => new Set());
    entry.occurrences.forEach((node) => {
      [node, ...(node.__parents || [])].forEach((item) => {
        const level = Number(item.level);
        if (level >= 0 && level < LEVELS.length) levelSets[level].add(item.__key);
      });
    });
    const levels = [...entry.levels].sort((a, b) => a - b);
    return {
      ...entry,
      levels,
      level: Math.max(...levels),
      counts: levelSets.map((items) => items.size),
      pathText: pathLabel(entry.occurrences[0]),
    };
  });
};

/** جستجوی کد/نام گره و مسیر والدها؛ نتیجه‌های دقیق‌تر اول می‌آیند. */
export const searchCatalog = (catalog, query) => {
  const q = norm(query);
  if (!q) return [];
  return catalog
    .map((entry) => {
      const code = norm(entry.code);
      const name = norm(entry.name);
      let score = null;
      if (code === q || name === q) score = 0;
      else if (code.startsWith(q) || name.startsWith(q)) score = 1;
      else if (code.includes(q) || name.includes(q)) score = 2;
      return score === null ? null : { ...entry, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || b.level - a.level
      || String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true }));
};
