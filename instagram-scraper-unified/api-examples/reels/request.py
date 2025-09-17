import requests

url = "https://instagram-looter2.p.rapidapi.com/reels"

querystring = {"id":"18527","count":"12"}

headers = {
	"x-rapidapi-key": "75f3fede68msh4ac39896fdd4ed6p185621jsn83e2bdaabc08",
	"x-rapidapi-host": "instagram-looter2.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())

#Max is 12 I think and max_id in querysting to get the next 12 reels