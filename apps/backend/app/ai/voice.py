import re

DEFAULT_VOICE = 'MI36FIkp9wRP7cpWKPTl'

def voice_id(value):
    if value is None or value.strip() == '':
        return None
    value = value.strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', value):
        raise ValueError('Voice ID must contain only letters, numbers, underscores or hyphens (up to 128 characters)')
    return value
