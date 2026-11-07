"""Low-concurrency Piper orchestration without importing ONNX in the API process."""
import fcntl
import os
import subprocess
import sys
import wave
from contextlib import contextmanager
from pathlib import Path

from fastapi import HTTPException
from app.corpus.config import storage_directory
from app.ai.piper_models import VOICE


def model_path():
    return Path(os.getenv('PIPER_MODEL_DIR', '/app/models/piper')) / (VOICE + '.onnx')


def check_ready():
    path = model_path()
    if not path.is_file() or not Path(str(path) + '.json').is_file():
        raise HTTPException(503, 'Piper Mandarin model is not installed. Rebuild the backend image or run the documented model setup command.')


@contextmanager
def generation_slot():
    directory = storage_directory() / 'option-audio'
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / 'piper.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise HTTPException(429, 'Piper is generating another recording. Try again shortly.') from None
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def synthesize(text, path):
    check_ready()
    subprocess.run(
        [sys.executable, '-m', 'app.ai.piper_worker', str(model_path()), str(path)],
        input=text, text=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
        timeout=60, check=True,
        env={**os.environ, 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1', 'MKL_NUM_THREADS': '1'},
    )
    with wave.open(str(path), 'rb') as audio:
        if audio.getnframes() == 0 or audio.getnchannels() != 1:
            raise ValueError('Piper returned invalid audio')
    return (None, None, None)
