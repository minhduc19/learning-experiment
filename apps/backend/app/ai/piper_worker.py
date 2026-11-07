"""Single-use CPU worker: loading and synthesis memory is released on process exit."""
import json
import os
import resource
import sys
import wave
from pathlib import Path


def synthesize(model_path, output_path, text):
    import onnxruntime as ort
    from piper import PiperVoice
    from piper.config import PiperConfig

    ort.disable_telemetry_events()
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    options.enable_cpu_mem_arena = False
    options.enable_mem_pattern = False
    voice = PiperVoice(
        session=ort.InferenceSession(str(model_path), sess_options=options, providers=['CPUExecutionProvider']),
        config=PiperConfig.from_dict(json.loads(Path(str(model_path) + '.json').read_text())),
    )
    with wave.open(str(output_path), 'wb') as output:
        voice.synthesize_wav(text, output)


if __name__ == '__main__':
    os.nice(10)
    resource.setrlimit(resource.RLIMIT_CPU, (30, 30))
    resource.setrlimit(resource.RLIMIT_FSIZE, (5 * 1024 * 1024, 5 * 1024 * 1024))
    synthesize(Path(sys.argv[1]), Path(sys.argv[2]), sys.stdin.read(200))
