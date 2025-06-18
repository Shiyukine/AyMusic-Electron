if [ $(getent group aymusic) ]; then
  groupdel aymusic
else
  echo "-"
fi
# remove the binary to /usr/local/bin
rm -f /usr/local/bin/aymusic