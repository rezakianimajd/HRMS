import io
import os
import traceback
import unittest

os.environ['DJANGO_SETTINGS_MODULE'] = 'hrms_project.settings.development'
os.environ.setdefault('SECRET_KEY', 'dev-only-local-secret')

LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '_correspondence_tests.log')
buffer = io.StringIO()
try:
    import django
    django.setup()
    suite = unittest.TestLoader().loadTestsFromNames([
        'correspondences.tests.NumberingTests',
        'correspondences.tests.LetterModelHelpersTests',
        'correspondences.tests.LetterSerializerValidationTests',
        'correspondences.tests.LettersMetaTests',
        'correspondences.tests.LegacyExcelParsingTests',
        'correspondences.tests.IncomingLetterSpecializationTests',
    ])
    result = unittest.TextTestRunner(verbosity=2, stream=buffer).run(suite)
    buffer.write(f"\nRUN={result.testsRun} FAIL={len(result.failures)} ERR={len(result.errors)}\n")
except Exception:
    buffer.write(traceback.format_exc())
with open(LOG, 'w', encoding='utf-8') as handle:
    handle.write(buffer.getvalue())
