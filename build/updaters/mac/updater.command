#! /bin/bash
echo "Starting updater script for macOS..."

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
        newstr=$(echo "$current" | sed 's|Resources/updater/updater.command||')
        newstr=$(echo "$newstr" | sed 's|Resources/updater/updaterTEMP.command||')
        cp -rf $newstr/DownloadTemp/* $newstr/
        rm -rf $newstr/DownloadTemp/
        echo "Update finished. Launching $app..."
        chmod +x $newstr/MacOS/$app
        $newstr/MacOS/$app < /dev/null &> /dev/null & disown
    	exit 0
    fi
fi