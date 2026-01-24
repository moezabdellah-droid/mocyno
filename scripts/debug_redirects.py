import requests

def check_url(url):
    print(f"Checking {url}...")
    try:
        response = requests.get(url, allow_redirects=False)
        print(f"Status: {response.status_code}")
        print(f"Headers: {response.headers}")
        if 'Location' in response.headers:
            print(f"Redirects to: {response.headers['Location']}")
            # Follow one level deeper
            check_url(response.headers['Location'])
        else:
            print("No redirect (Final destination)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("--- CHAIN 1: /a-propos ---")
    check_url("https://mocyno.com/a-propos")
    print("\n--- CHAIN 2: /a-propos/ ---")
    check_url("https://mocyno.com/a-propos/")
