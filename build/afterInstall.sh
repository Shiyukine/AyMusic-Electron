#!/bin/bash

if [ $(getent group aymusic) ]; then
  echo "-"
else
  groupadd aymusic
fi
usermod -aG aymusic $USER
setfacl -Rm g:aymusic:rwX /opt/aymusic/
# exec newgrp aymusic
# exec newgrp $USER
pkexec bash -c "chmod 4775 /opt/aymusic/chrome-sandbox"
echo "After install script executed successfully."
echo "Please log out and log back in to apply group changes."
echo "You can also run 'newgrp aymusic' to apply group changes immediately."