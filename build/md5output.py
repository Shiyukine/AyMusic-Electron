import hashlib
import os
import json
import sys


out = {}
#out["***INFOS***"] = "https://192.168.0.33/dl/AyMusic/dlTemp/%platform%/%file%"
out["***INFOS***"] = "https://files.aketsuky.net/dl/AyMusic/Updates/%platform%/%file%"
plat = sys.argv[1]
platform = ""
if plat == "win":
    platform = "windows"
    mainPath = "./dist/" + plat + "-unpacked/"
elif plat == "linux":
    platform = "linux"
    mainPath = "./dist/" + plat + "-unpacked/"
else:
    platform = plat
    mainPath = "./dist/" + plat + "/aymusic.app/Contents/"

for path, subdirs, files in os.walk(mainPath):
    for name in files:
        p = os.path.join(path, name)
        try:
            md5 = hashlib.sha256(open(p, 'rb').read()).hexdigest()
             # remove if it's a symlink on macOS, causing issues
            if plat == "mac" and os.path.islink(p):
                continue
            out[p.replace(mainPath, "").replace("\\", "/")] = md5
        except:
            print("Err", p)

f = open("./dist/update_" + platform + ".json", "w")
f.write(json.dumps(out))
f.close()

#print(hashlib.sha256(open("./build/c.sosu", 'rb').read()).hexdigest())
