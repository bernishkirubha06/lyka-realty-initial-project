import requests
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    uid = str(uuid.uuid4())[:8]
    email = f"lead_{uid}@lykarealty.ae"

    print("=== TEST 1: Unauthenticated user gets 0 site visits ===")
    res_guest = requests.get(f"{BASE_URL}/site-visits/my-visits")
    assert res_guest.status_code == 200, f"Guest visits failed: {res_guest.text}"
    guest_visits = res_guest.json()
    assert len(guest_visits) == 0, f"Expected 0 visits for guest, got {len(guest_visits)}"
    print("PASS: Unauthenticated user gets [] (strictly empty).")

    print("\n=== TEST 2: Register New Client Account ===")
    reg_payload = {
        "email": email,
        "password": "Password123!",
        "full_name": "Tariq Mansoor",
        "phone": "+971521234567",
        "role": "client",
        "address": "Apartment 1402, Marina Gate 2, Dubai Marina",
        "country": "United Arab Emirates",
        "gender": "Male",
        "dob": "1990-04-12"
    }
    res_reg = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    assert res_reg.status_code == 200, f"Registration failed: {res_reg.text}"
    token = res_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("PASS: Client registered successfully.")

    print("\n=== TEST 3: Initially, registered client has 0 visits ===")
    res_my_visits_init = requests.get(f"{BASE_URL}/site-visits/my-visits", headers=headers)
    assert res_my_visits_init.status_code == 200
    assert len(res_my_visits_init.json()) == 0
    print("PASS: Newly registered client has 0 site visits.")

    print("\n=== TEST 4: Client schedules VIP visit ===")
    visit_payload = {
        "property_id": 1,
        "preferred_date": "2026-10-25",
        "preferred_time": "11:00 AM",
        "customer_name": "Tariq Mansoor",
        "contact_phone": "+971521234567",
        "contact_email": email,
        "notes": "Interested in direct marina view balcony."
    }
    res_visit = requests.post(f"{BASE_URL}/site-visits", json=visit_payload, headers=headers)
    assert res_visit.status_code == 200, f"Schedule visit failed: {res_visit.text}"
    visit_data = res_visit.json()
    print(f"PASS: Scheduled visit #{visit_data['id']} successfully.")

    print("\n=== TEST 5: Verify visit is in client's dashboard visits ===")
    res_my_visits_after = requests.get(f"{BASE_URL}/site-visits/my-visits", headers=headers)
    assert res_my_visits_after.status_code == 200
    my_visits = res_my_visits_after.json()
    assert len(my_visits) == 1, f"Expected 1 visit, got {len(my_visits)}"
    assert my_visits[0]["customer_name"] == "Tariq Mansoor"
    print(f"PASS: Visit #{my_visits[0]['id']} belongs strictly to Tariq Mansoor.")

    print("\n=== TEST 6: Other users or unauthenticated visitors see 0 of Tariq's visits ===")
    res_guest_again = requests.get(f"{BASE_URL}/site-visits/my-visits")
    assert len(res_guest_again.json()) == 0
    print("PASS: Unauthenticated visitors still see 0 visits.")

    print("\nALL VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!")

if __name__ == "__main__":
    run_tests()
