import os
has_key = bool(os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY'))
if has_key:
    print('API_KEY_PRESENT')
else:
    print('NO_API_KEY')
