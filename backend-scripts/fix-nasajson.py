#!/usr/bin/python

import json
from pprint import pprint
import datetime
from time import gmtime, strftime, strptime
import sys

orig = json.loads(sys.stdin.read())
sort = sorted(orig, key=lambda x: -x['centroid_coordinates']['lon'])
print(json.dumps(sort, separators=(',',':')))
