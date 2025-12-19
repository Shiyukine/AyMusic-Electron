#!/bin/bash
# AyMusic Updater Script for Linux
# Do not modify this file or the update process may break.

if [ $(getent group aymusic) ]; then
  echo "group exists."
else
  echo "group does not exist."
  # https://youtrack.jetbrains.com/projects/CPP/issues/CPP-45629/Run-debug-with-root-on-Ubuntu-25-with-pkexec-hangs
  bash -c "ulimit -n 128 && pkexec bash -c 'groupadd aymusic && usermod -aG aymusic $USER && setfacl -Rm g:aymusic:rwX /opt/aymusic/'"
fi

movefiles=false;
refreshed=false;
app=none;
i=1;

while [ "$i" -le $# ]; 
do
    if [ ${!i} = "--move-files" ] 
    then 
        movefiles=true;

    elif [ ${!i} = "--refreshed" ];
    then 
        refreshed=true;

    elif [ ${!i} = "--app" ];
    then ((i++)) 
        app=${!i};    
    fi
    i=$(( i + 1 ))

done;

if [ $refreshed = false ];
then
    echo "To fully start app, we need to detach this child to the parent process. Restarting..."
    $0 "$@" --refreshed < /dev/null &> /dev/null & disown
    exit 0
else
    if [ $movefiles = true ];
    then
        echo "Waiting 2s..."
        sleep 2
        echo "Applying update..."
        current=$0
        newstr=${current/"AketsukyUpdater.sh"/""}
        newstr=${newstr/"AketsukyUpdaterTEMP.sh"/""}
        cp -rf $newstr/DownloadTemp/* $newstr/
        rm -rf $newstr/DownloadTemp/
        echo "Updated finished. Launching $app..."
        if [ "$(stat -c '%a' $newstr/chrome-sandbox)" = "4755" ]; then
            echo "chrome-sandbox has 4755 permissions"
        else
            bash -c "ulimit -n 128 && pkexec bash -c 'chown root:root $newstr/chrome-sandbox && chmod 4755 $newstr/chrome-sandbox'"
        fi
        chmod +x $newstr/chrome_crashpad_handler
        chmod +x $newstr$app
        # https://github.com/castlabs/electron-releases/issues/165
        unset CHROME_DESKTOP
        $newstr$app < /dev/null &> /dev/null & disown
        notify-send -a "AyMusic" "Update" "App updated successfully."
    	exit 0
    fi
fi
