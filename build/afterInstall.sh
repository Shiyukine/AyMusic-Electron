#!/bin/bash

if [ $(getent group aymusic) ]; then
  echo "group exists."
  pkexec bash -c "usermod -aG aymusic $USER && setfacl -Rm g:aymusic:rwX /opt/aymusic/"
else
  echo "group does not exist."
  pkexec bash -c "groupadd aymusic && usermod -aG aymusic $USER && setfacl -Rm g:aymusic:rwX /opt/aymusic/"
  echo "Group aymusic created and user added."
fi
setfacl -Rm g:aymusic:rwX /opt/aymusic/
pkexec bash -c "chmod 4775 /opt/aymusic/chrome-sandbox"