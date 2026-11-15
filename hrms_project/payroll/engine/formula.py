"""Safe payroll formula engine.

Only arithmetic, comparisons and an explicit whitelist of functions are
supported. No attribute access, imports, comprehensions or arbitrary calls are
allowed, so a formula stored by an administrator can never execute Python.
"""
from __future__ import annotations

import ast
from decimal import Decimal, InvalidOperation

ALLOWED_FUNCTIONS = {'SUM', 'MIN', 'MAX', 'ROUND', 'IF', 'ABS', 'COALESCE'}
ALLOWED_COMPARE = (ast.Gt, ast.GtE, ast.Lt, ast.LtE, ast.Eq, ast.NotEq)


class FormulaError(ValueError):
    """Invalid or unsafe formula."""


def _decimal(value):
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):
        return Decimal(1 if value else 0)
    if value is None or value == '':
        return Decimal('0')
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise FormulaError(f'مقدار عددی نامعتبر: {value!r}') from exc


def _eval(node, context):
    if isinstance(node, ast.Expression):
        return _eval(node.body, context)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool):
            return bool(node.value)
        if isinstance(node.value, (int, float, str)):
            return _decimal(node.value)
        raise FormulaError('فقط عدد و مقایسه در فرمول مجاز است.')
    if isinstance(node, ast.Name):
        name = node.id
        if name.startswith('__') or name not in context:
            return Decimal('0')
        return context[name]
    if isinstance(node, ast.UnaryOp):
        value = _eval(node.operand, context)
        if isinstance(node.op, ast.USub):
            return -_decimal(value)
        if isinstance(node.op, ast.UAdd):
            return _decimal(value)
        if isinstance(node.op, ast.Not):
            return not bool(value)
        raise FormulaError('عملگر یکانی مجاز نیست.')
    if isinstance(node, ast.BinOp):
        left = _decimal(_eval(node.left, context))
        right = _decimal(_eval(node.right, context))
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                raise FormulaError('تقسیم بر صفر در فرمول.')
            return left / right
        if isinstance(node.op, ast.Mod):
            if right == 0:
                raise FormulaError('باقی‌مانده بر صفر در فرمول.')
            return left % right
        if isinstance(node.op, ast.Pow):
            if abs(right) > 10:
                raise FormulaError('توان بیش از حد مجاز است.')
            return left ** right
        raise FormulaError('عملگر ریاضی مجاز نیست.')
    if isinstance(node, ast.Compare):
        left = _eval(node.left, context)
        for op, comparator in zip(node.ops, node.comparators):
            right = _eval(comparator, context)
            if not isinstance(op, ALLOWED_COMPARE):
                raise FormulaError('عملگر مقایسه مجاز نیست.')
            if isinstance(op, ast.Gt) and not (_decimal(left) > _decimal(right)):
                return False
            if isinstance(op, ast.GtE) and not (_decimal(left) >= _decimal(right)):
                return False
            if isinstance(op, ast.Lt) and not (_decimal(left) < _decimal(right)):
                return False
            if isinstance(op, ast.LtE) and not (_decimal(left) <= _decimal(right)):
                return False
            if isinstance(op, ast.Eq) and not (_decimal(left) == _decimal(right)):
                return False
            if isinstance(op, ast.NotEq) and not (_decimal(left) != _decimal(right)):
                return False
            left = right
        return True
    if isinstance(node, ast.BoolOp):
        values = [_eval(value, context) for value in node.values]
        if isinstance(node.op, ast.And):
            return all(bool(v) for v in values)
        if isinstance(node.op, ast.Or):
            return any(bool(v) for v in values)
        raise FormulaError('عملگر منطقی مجاز نیست.')
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in ALLOWED_FUNCTIONS:
            raise FormulaError('تابع در فرمول مجاز نیست.')
        name = node.func.id
        if node.keywords:
            raise FormulaError('آرگومان نام‌دار در فرمول مجاز نیست.')
        args = [_eval(arg, context) for arg in node.args]
        if name == 'SUM':
            return sum((_decimal(arg) for arg in args), Decimal('0'))
        if name == 'MIN':
            return min(_decimal(arg) for arg in args) if args else Decimal('0')
        if name == 'MAX':
            return max(_decimal(arg) for arg in args) if args else Decimal('0')
        if name == 'ABS':
            return abs(_decimal(args[0])) if args else Decimal('0')
        if name == 'ROUND':
            value = _decimal(args[0]) if args else Decimal('0')
            digits = int(_decimal(args[1])) if len(args) > 1 else 0
            return round(value, digits)
        if name == 'IF':
            condition = bool(args[0]) if args else False
            if condition and len(args) > 1:
                return args[1]
            return args[2] if len(args) > 2 else Decimal('0')
        if name == 'COALESCE':
            for arg in args:
                if arg not in (None, ''):
                    return arg
            return Decimal('0')
    raise FormulaError('ساختار فرمول مجاز نیست.')


def parse(formula):
    formula = (formula or '').strip()
    if not formula:
        raise FormulaError('فرمول خالی است.')
    if len(formula) > 1000:
        raise FormulaError('فرمول بیش از حد طولانی است.')
    try:
        return ast.parse(formula, mode='eval')
    except SyntaxError as exc:
        raise FormulaError('ساختار فرمول نامعتبر است.') from exc


def validate_formula(formula):
    """Return referenced variable names after a safe syntax/walk check."""
    tree = parse(formula)
    names = set()
    blocked = (ast.Import, ast.ImportFrom, ast.Attribute, ast.Subscript,
               ast.List, ast.Dict, ast.Set, ast.Lambda, ast.comprehension)
    for node in ast.walk(tree):
        if isinstance(node, blocked):
            raise FormulaError('این ساختار در فرمول مجاز نیست.')
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in ALLOWED_FUNCTIONS:
                raise FormulaError('تابع در فرمول مجاز نیست.')
        if isinstance(node, ast.Name):
            names.add(node.id)
    return sorted(names)


def evaluate(formula, context):
    tree = parse(formula)
    result = _eval(tree, context or {})
    if isinstance(result, bool):
        return Decimal(1 if result else 0)
    return _decimal(result)
