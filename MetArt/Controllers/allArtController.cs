using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using MyArtPage.allArt;

namespace MyArtPage.Controllers


{
    [Route("allArt")] // ruta
    public class allArtController : Controller
    {
        private readonly ILogger<allArtController> _logger;
        private readonly IHttpClientFactory _clientFactory;

        public allArtController(ILogger<allArtController> logger, IHttpClientFactory clientFactory)
        {
            _logger = logger;
            _clientFactory = clientFactory;
        }

        public async Task<IActionResult> Index()
        {
            using (HttpClient client = _clientFactory.CreateClient())
            {
                // search art that is highlights and have images
                string searchUrl = "https://collectionapi.metmuseum.org/public/collection/v1/search?isHighlight=true&hasImages=true&q=a";
                // Search for especific object
                string objectUrl = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";

                List<int> objectIds = new List<int>();

                HttpResponseMessage searchResponse = await client.GetAsync(searchUrl); // Call Api Async
                
                
                string content = await searchResponse.Content.ReadAsStringAsync(); // Read response as string

                dynamic searchResult = JsonConvert.DeserializeObject(content); // deserialize json to an object

                
                    foreach (int objectId in searchResult.objectIDs)
                    {
                        objectIds.Add(objectId); // add the objectId (1,23, 3256) to a List.
                    }
                
            

                Random random = new Random();
                List<ArtPiece> artPieces = new List<ArtPiece>(); // create list to store each art piece

                for (int i = 0; i < 10; i++)
                {
                    int index = random.Next(objectIds.Count);
                    int randomObjectId = objectIds[index]; // random piece from all

                    string objectDetailsUrl = objectUrl + randomObjectId; // finish the url with the object id
                    // "https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}"

                    HttpResponseMessage objectResponse = await client.GetAsync(objectDetailsUrl); // call api
                    
                        string objectResponseContent = await objectResponse.Content.ReadAsStringAsync();
                        dynamic objectDetails = JsonConvert.DeserializeObject(objectResponseContent); // deserialize json

                        ArtPiece artPiece = new ArtPiece // instantiate a new art Piece and give it its atributes
                        {
                            ObjectId = randomObjectId,
                            Title = objectDetails?.title,
                            PrimaryImage = objectDetails?.primaryImage,
                            Department = objectDetails?.department,
                            Culture = objectDetails?.culture,
                            Period = objectDetails?.period,
                            Artist = objectDetails?.artistDisplayName,
                            Date = objectDetails?.objectDate,
                            Link = objectDetails?.objectURL
                        };

                        artPieces.Add(artPiece); // add that instance to the list
                    }
                

                return View(artPieces); // return list
            } 
        }
    }
}

