#!/bin/bash
#trap '' HUP SIGINT SIGTERM EXIT

if [ $(getent group aymusic) ]; then
  echo "group exists."
else
  echo "group does not exist."
  pkexec bash -c "groupadd aymusic && usermod -aG aymusic $USER && setfacl -Rm g:aymusic:rwX /opt/aymusic/"
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

#echo $app

if [ $refreshed = false ];
then
    echo "To fully start app, we need to detach this child to the parent process. Restarting..."
    #(set -m; $0 --move-files --app $app --refreshed &)
    #$0 --move-files --app $app --refreshed 
    $0 "$@" --refreshed < /dev/null &> /dev/null & disown
    exit 0
    #nohup ./AketsukyUpdater.sh --move-files --app $app --refreshed &
else
    if [ $movefiles = true ];
    then
        echo "Waiting 2s..."
        sleep 2
        echo "Applying update..."
        current=$0
        newstr=${current/"AketsukyUpdater.sh"/""}
        newstr=${newstr/"AketsukyUpdaterTEMP.sh"/""}
        #mv -f DownloadTemp/* ./
        cp -rf $newstr/DownloadTemp/* $newstr/
        rm -rf $newstr/DownloadTemp/
        echo "Updated finished. Launching $app..."
        #(set -m; $newstr$app &)
        #$newstr$app
        #$SHELL
        chmod 4775 $newstr/chrome-sandbox
        chmod +x $newstr/aymusic
        $newstr$app < /dev/null &> /dev/null & disown || $newstr$app --no-sandbox --no-zygote < /dev/null &> /dev/null & disown
        #gnome-terminal echo
        #gnome-terminal -- bash -c "echo {$app}; $SHELL"
    	exit 0
        #./electron
    fi
fi
