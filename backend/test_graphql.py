#!/usr/bin/env python3
"""
Quick test script to figure out the correct SL1 GraphQL queries
"""

import requests
import json
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# SL1 Configuration
SL1_URL = "https://52.3.210.190/gql"
SL1_USER = "rpoppes_gql"
SL1_PASS = "T3stSL!pwd"

def test_query(query_name, query, variables=None):
    """Test a GraphQL query and print results"""
    print(f"\n{'='*60}")
    print(f"Testing: {query_name}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(
            SL1_URL,
            json={
                "query": query,
                "variables": variables or {}
            },
            auth=(SL1_USER, SL1_PASS),
            verify=False
        )
        
        result = response.json()
        
        if "errors" in result:
            print("❌ GraphQL Errors:")
            print(json.dumps(result["errors"], indent=2))
        
        if "data" in result:
            print("✅ Data received:")
            print(json.dumps(result["data"], indent=2))
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

# Test 1: Simple devices query
print("\n" + "="*60)
print("TEST 1: Basic devices query (no parameters)")
print("="*60)

query1 = """
query {
  devices(first: 2) {
    edges {
      node {
        id
        name
      }
    }
  }
}
"""
test_query("Basic devices", query1)

# Test 2: Devices with more fields
query2 = """
query {
  devices(first: 2) {
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
test_query("Devices with state", query2)

# Test 3: Check if deviceClass needs subfields
query3 = """
query {
  devices(first: 2) {
    edges {
      node {
        id
        name
        deviceClass {
          name
        }
      }
    }
  }
}
"""
test_query("Devices with deviceClass", query3)

# Test 4: Check organization structure
query4 = """
query {
  devices(first: 2) {
    edges {
      node {
        id
        name
        organization {
          name
        }
      }
    }
  }
}
"""
test_query("Devices with organization", query4)

# Test 5: Test pagination
query5 = """
query {
  devices(first: 2) {
    edges {
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
"""
test_query("Devices with pagination", query5)

# Test 6: Test search (if it works)
query6 = """
query {
  devices(first: 2, search: "server") {
    edges {
      node {
        id
        name
      }
    }
  }
}
"""
test_query("Devices with search", query6)

print("\n" + "="*60)
print("TESTING COMPLETE!")
print("="*60)