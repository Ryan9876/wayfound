from pathlib import Path
import shutil

source = Path('app/interview-model.js')
target = Path('web/src/shared/interview-model.js')
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, target)
