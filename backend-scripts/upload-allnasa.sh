#!/bin/bash

set -e

. .sshpw

cd cdn
lftp -c "open sftp://nasa.kj58yy565gqqhv2gx:$SSHPASS@ftp.nasa.kj58yy565gqqhv2gx.maxcdn-edge.com && cd public_html && put allnasa.json" </dev/null >/dev/null
