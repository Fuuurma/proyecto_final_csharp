using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MyArtPage.TopArtists;

namespace MyArtPage.Controllers
{
    public class HomeController : Controller
    {
        public async Task<IActionResult> Index()
        {
            List<string> artists = new List<string> { "Rembrandt-van","gogh", "renoir"}; // list of artists
            // List<string> artists = new List<string> { "monet", "picasso", "gogh"}; // list of artists

            List<string> objectIds = new List<string>(); // list that have the ids of pieces of each artist

           foreach (string artist in artists)
{
    Random random = new Random();
    List<string> artistObjectIds = await GetObjectIds(artist); // call function

    int numberOfObjectsToSelect = 3; // Set the desired number of random object IDs to select
    int totalObjects = artistObjectIds.Count;

    List<string> selectedObjectIds = new List<string>(); // To store the selected IDs

    for (int i = 0; i < numberOfObjectsToSelect; i++)
    {
        int randomIndex;
        string selectedId;

        do
        {
            randomIndex = random.Next(totalObjects);
            selectedId = artistObjectIds[randomIndex];
        }
        while (selectedObjectIds.Contains(selectedId)); // Check if ID is already selected

        objectIds.Add(selectedId);
        selectedObjectIds.Add(selectedId);
    }
}



            List<ArtPiece> artPieces = new List<ArtPiece>(); // list for all the complete pieces

            foreach (string objectId in objectIds)
            {
                ArtPiece artPiece = await GetArtPiece(objectId); // call function
                artPieces.Add(artPiece); // add art to the list.
            }

            ViewBag.ArtPieces = artPieces; // show list as ViewBag.artPieces.atr

            return View();
        }

        private static async Task<List<string>> GetObjectIds(string artist) // function to get ObjectIds from each Artist
        {
            string apiUrl = $"https://collectionapi.metmuseum.org/public/collection/v1/search?artistOrCulture=true&isHighlight=true&q={artist}";

            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(apiUrl); // call api
                
                    string result = await response.Content.ReadAsStringAsync(); //read response as string
                    dynamic data = Newtonsoft.Json.JsonConvert.DeserializeObject(result); // deserialize json
                    List<string> objectIds = new List<string>(); // list for object ids

                    for (int i = 0; i < 3; i++)
                    {
                        objectIds.Add(data.objectIDs[i].ToString()); // add id
                    }

                    return objectIds;
                
            }
        }

        private static async Task<ArtPiece> GetArtPiece(string objectId)
        {
            string apiUrl = $"https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectId}"; // using each objectId

            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(apiUrl); // call api
                
                    string result = await response.Content.ReadAsStringAsync(); //read response as string
                    dynamic? data = Newtonsoft.Json.JsonConvert.DeserializeObject(result); // desrialize json
                    ArtPiece artPiece = new ArtPiece // new instance and assign its atriibutes
                    {
                        ObjectId = data.objectID,
                        Title = data.title,
                        PrimaryImage = data.primaryImage,
                        Department = data.department,
                        Culture = data.culture,
                        Period = data.period,
                        Artist = data.artistDisplayName,
                        Date = data.objectDate,
                        Link = data.objectURL
                    };

                    return artPiece;
                
               
            }
        }
    }
}
