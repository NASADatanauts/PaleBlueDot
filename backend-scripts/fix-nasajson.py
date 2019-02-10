#!/usr/bin/python

import json
from pprint import pprint
import datetime
from time import gmtime, strftime, strptime
import sys

def labda(x): 
    if x['centroid_coordinates']:
        return True
    else:
        sys.stderr.write("Fogtunk hibat\n")
        return False
orig = json.loads(sys.stdin.read())
filtered = filter(lambda x: x['centroid_coordinates'], orig)
sort = sorted(filtered, key=lambda x: -x['centroid_coordinates']['lon'])
print(json.dumps(sort, separators=(',',':')))
