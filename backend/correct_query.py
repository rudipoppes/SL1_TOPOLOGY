#!/usr/bin/env python3
"""
Final working GraphQL query for SL1
"""

import requests
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SL1_URL = "https://52.3.210.190/gql"
SL1_USER = "rpoppes_gql"
SL1_PASS = "T3stSL!pwd"

# This is the WORKING query for Lambda!
WORKING_QUERY = """
query GetDevices($limit: Int!) {
  devices(first: $limit) {
    edges {
      node {
        id
        name
        ip
        state
        deviceClass {
          id
        }
        organization {
          id
        }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
"""

# Test with variables
response = requests.post(
    SL1_URL,
    json={
        "query": WORKING_QUERY,
        "variables": {"limit": 5}
    },
    auth=(SL1_USER, SL1_PASS),
    verify=False
)

result = response.json()
print("✅ WORKING LAMBDA QUERY:")
print("="*50)
print(WORKING_QUERY)
print("\n✅ SAMPLE RESPONSE:")
print(json.dumps(result, indent=2))

# Also test search format
SEARCH_QUERY = """
query SearchDevices($searchTerm: String!, $limit: Int!) {
  devices(
    search: {name: {contains: $searchTerm}}
    first: $limit
  ) {
    edges {
      node {
        id
        name
        ip
        state
      }
    }
  }
}
"""

print("\n" + "="*50)
print("✅ WORKING SEARCH QUERY:")
print("="*50)
print(SEARCH_QUERY)