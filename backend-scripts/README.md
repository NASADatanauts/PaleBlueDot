# Backend scripts for PaleBlueDot

These are necessary, because the epic server from Nasa is too slow:
  - for serving out the daily json files,
  - for serving the image files if you are not close to the server.

We solve these issues by:
  - recompressing the image files,
  - sharing them on a maxcdn push zone,
  - putting all the relevant json information in one big json file,
    instead of daily.

To install these scripts on a server, we had to:

    cd ~
    mkdir nasa
    cd nasa
    # upload all files from this directory to this new nasa directory
    mkdir cdn image-day-done nasajsons nasajsons-fixed tmp upload-day-done
    echo >.sshpw
      SSHPASS=<maxcdn password comes here>
    crontab -e
      11 19 * * *      cd ~/nasa && ./daily.sh
