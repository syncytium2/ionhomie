#!/usr/bin/env bash
# Put screenshots (or any PNGs) in the darkroom under the estate filename scheme
# (armory tools/naming/README.md): explainer_ionhomie-<topic>_<YYYYMMDD>.png, the name built by
# armory's artifact_name.py, never typed. Then armory's show.py places it.
#
#   bash scripts/darkroom.sh                      every screenshots/*.png, as "screenshot <route> <width>"
#   bash scripts/darkroom.sh "<topic words>" FILE  one file under a topic of your own
set -euo pipefail
ARMORY="$HOME/Developer/armory/tools"
[[ -f "$ARMORY/naming/artifact_name.py" && -f "$ARMORY/show.py" ]] || { echo "armory's naming or show tool is missing" >&2; exit 1; }
DATE="$(date +%Y%m%d)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
place() { # topic, file
  local name; name="$(python3 "$ARMORY/naming/artifact_name.py" build --type explainer --topic "ionhomie $1" --ext png --date "$DATE")"
  cp "$2" "$TMP/$name" && python3 "$ARMORY/show.py" --no-open --project ionhomie "$TMP/$name" | tail -1
}
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ $# -ge 2 ]]; then place "$1" "$2"; exit; fi
for f in screenshots/*.png; do
  b="$(basename "$f" .png)"; route="${b%_*}"; width="${b##*_}"
  place "screenshot ${route//-/ } $width" "$f"
done
