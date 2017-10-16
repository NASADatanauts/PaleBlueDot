#!/bin/bash

set -e

if [ -x /usr/local/bin/gdate ]; then
    DATEBIN=gdate
else
    DATEBIN=date
fi

mkdir -p nasajsons nasajsons-fixed
for i in `seq 0 40`; do
  DATE=$($DATEBIN -d "-$i days" +%Y-%m-%d)
  OUT=nasajsons/$DATE.json
  if [ -e $OUT ]; then
    if [ $(stat -c %s $OUT) -le 2 ]; then
      rm -f upload-day-done/$DATE image-day-done/$DATE
      rm -f $OUT
    fi
  fi
  [ -e $OUT ] || wget -q -O $OUT https://epic.gsfc.nasa.gov/api/natural/date/$DATE?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo || { rm -f $OUT ; echo nasa server fail ; exit 1 ; }
  ./fix-nasajson.py <$OUT >nasajsons-fixed/$DATE.json
done
