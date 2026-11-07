"""Build-time download of the Mandarin Piper voice, verified against its manifest."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

VOICE = 'zh_CN-huayan-medium'
MODEL_VERSION = '40cdb7930ff91b81574d5f0489e076ea'
BASE_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/'
# Source: rhasspy/piper src/python_run/piper/voices.json (official voice manifest).
FILES = {
    VOICE + '.onnx': (63201294, MODEL_VERSION),
    VOICE + '.onnx.json': (6922, 'f1c77a621e220d545042a4c8c2eaae64'),
    'MODEL_CARD': (276, 'b23255ace0cda4c2e02134d8a70c2e03'),
}


def verified(path, size, digest):
    if not path.is_file() or path.stat().st_size != size:
        return False
    checksum = hashlib.md5(usedforsecurity=False)
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(chunk)
    return checksum.hexdigest() == digest


def download(directory):
    directory.mkdir(parents=True, exist_ok=True)
    for name, (size, digest) in FILES.items():
        path = directory / name
        if verified(path, size, digest):
            continue
        temporary = path.with_suffix(path.suffix + '.part')
        try:
            with urlopen(BASE_URL + name, timeout=60) as response, temporary.open('wb') as output:
                received = 0
                while chunk := response.read(1024 * 1024):
                    received += len(chunk)
                    if received > size:
                        raise ValueError('Piper download exceeded expected file size')
                    output.write(chunk)
            if not verified(temporary, size, digest):
                raise ValueError('Piper voice download failed manifest verification: ' + name)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
    json.loads((directory / (VOICE + '.onnx.json')).read_text())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, required=True)
    download(parser.parse_args().directory)
