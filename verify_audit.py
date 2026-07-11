import base64
import json
import urllib.request

def run_test_audit(sample_type):
    print(f"=== TESTING AUDIT FOR: {sample_type.upper()} ===")
    
    # Load and encode image
    image_path = f"public/samples/{sample_type}_receipt.png"
    with open(image_path, "rb") as image_file:
        base64_data = base64.b64encode(image_file.read()).decode('utf-8')
        
    mime_type = "image/png"
    
    # Active policies (replicate frontend default state)
    policies = [
      { "id": "max-limit", "name": "Maximum Transaction Limit", "description": "Total transaction amount must not exceed $100.00", "enabled": True, "val": 100 },
      { "id": "no-alcohol", "name": "Restricted Item: Alcohol", "description": "Expenses must not contain alcohol, liquor, wine, beer, or bar visits", "enabled": True },
      { "id": "age-limit", "name": "Receipt Recency", "description": "Receipt date must not be older than 90 days from today", "enabled": True },
      { "id": "weekend-spend", "name": "Weekday Expense Rule", "description": "Transactions should take place on standard business weekdays (Mon-Fri)", "enabled": False }
    ]
    
    payload = {
        "fileData": f"data:{mime_type};base64,{base64_data}",
        "mimeType": mime_type,
        "policies": policies
    }
    
    # Prepare HTTP Request
    req = urllib.request.Request(
        "http://localhost:3000/api/audit",
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            parsed_res = json.loads(res_body)
            print(json.dumps(parsed_res, indent=2))
            
            # Simple assertions to verify behavior
            comp_check = parsed_res.get('complianceCheck', {})
            is_compliant = comp_check.get('isCompliant', None)
            print(f"\nAUDIT STATUS: {'PASSED' if is_compliant else 'FAILED'}")
            print(f"REASON: {comp_check.get('reason')}")
            print(f"ANOMALIES FLAGGED: {len(comp_check.get('flaggedAnomalies', []))}")
            for idx, anomaly in enumerate(comp_check.get('flaggedAnomalies', [])):
                print(f"  - Anomaly {idx+1}: {anomaly.get('anomalyType')} (Severity: {anomaly.get('severity')})")
                print(f"    Violated Rule: {anomaly.get('ruleViolated')}")
                print(f"    Description: {anomaly.get('description')}")
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error occurred: {e}")
    print("=" * 40 + "\n")

# Test both samples
try:
    run_test_audit("compliant")
    run_test_audit("non_compliant")
except Exception as e:
    print(f"Failed to execute tests: {e}")
