#!/usr/bin/env python3
"""
Test what fields are available on deviceClass and organization
"""

import requests
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SL1_URL = "https://52.3.210.190/gql"
SL1_USER = "rpoppes_gql"
SL1_PASS = "T3stSL!pwd"

def test_query(query_name, query):
    print(f"\n{'='*50}")
    print(f"Testing: {query_name}")
    print(f"{'='*50}")
    
    try:
        response = requests.post(
            SL1_URL,
            json={"query": query},
            auth=(SL1_USER, SL1_PASS),
            verify=False
        )
        
        result = response.json()
        
        if "errors" in result:
            print("❌ Errors:")
            print(json.dumps(result["errors"], indent=2))
        
        if "data" in result:
            print("✅ Data:")
            print(json.dumps(result["data"], indent=2))
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

# Test different deviceClass fields
test_query("deviceClass with id", """
query {
  devices(first: 1) {
    edges {
      node {
        id
        name
        deviceClass {
          id
        }
      }
    }
  }
}
""")

test_query("organization with id", """
query {
  devices(first: 1) {
    edges {
      node {
        id
        name
        organization {
          id
        }
      }
    }
  }
}
""")

# Test search with proper DeviceSearch format
test_query("search with DeviceSearch object", """
query {
  devices(first: 2, search: {name: {contains: "SELAB"}}) {
    edges {
      node {
        id
        name
      }
    }
  }
}
""")

# Test our working query
test_query("Complete working query", """
query {
  devices(first: 3) {
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
""")