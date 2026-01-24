import urllib.request
import urllib.error

def check_url(url, depth=0):
    if depth > 5:
        print("Max redirect depth reached (Loop?)")
        return

    print(f"Checking {url}...")
    try:
        req = urllib.request.Request(url, method='HEAD')
        
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def http_error_302(self, req, fp, code, msg, headers):
                return fp, code, msg, headers
            http_error_301 = http_error_302
            http_error_303 = http_error_302
            http_error_307 = http_error_302

        opener = urllib.request.build_opener(NoRedirectHandler)
        try:
            response = opener.open(req)
            if isinstance(response, tuple):
                 fp, code, msg, headers = response
                 print(f"Status: {code}")
                 if 'Location' in headers:
                     target = headers['Location']
                     print(f"Redirects to: {target}")
                     check_url(target, depth+1)
            else:
                print(f"Status: {response.getcode()} (Final)")
                
        except urllib.error.HTTPError as e:
            print(f"HTTP Error: {e.code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("--- CHAIN: /secteurs/luxe ---")
    check_url("https://mocyno.com/secteurs/luxe")
