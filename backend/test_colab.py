from gradio_client import Client

url = "https://210ad659d00d5cd206.gradio.live"

try:
    print("Connecting to the new Colab server...")
    client = Client(url)
    client.view_api()
    print("\nConnection successful!")
except Exception as e:
    print("Connection failed:", repr(e))
