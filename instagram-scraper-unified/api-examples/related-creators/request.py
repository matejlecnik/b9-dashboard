import requests

url = "https://instagram-looter2.p.rapidapi.com/related-profiles"

querystring = {"id":"18527"}

headers = {
	"x-rapidapi-key": "75f3fede68msh4ac39896fdd4ed6p185621jsn83e2bdaabc08",
	"x-rapidapi-host": "instagram-looter2.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())