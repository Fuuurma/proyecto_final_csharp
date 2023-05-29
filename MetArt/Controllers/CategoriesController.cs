using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using MyArtPage.Categories;

namespace MyArtPage.Controllers
{
    [Route("categories")]
    public class CategoriesController : Controller
    {
        private readonly ILogger<CategoriesController> _logger;
        private readonly IHttpClientFactory _clientFactory;

        public CategoriesController(ILogger<CategoriesController> logger, IHttpClientFactory clientFactory)
        {
            _logger = logger;
            _clientFactory = clientFactory;
        }

        public async Task<IActionResult> Index()
        {
            List<ArtCategory> artCategories = new List<ArtCategory>(); // list for all categories

            string objectUrl = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";

            using (HttpClient client = _clientFactory.CreateClient())
            {
                for (int i = 1; i <= 21; i++)
                {   // call api using an int as category
                    string category = $"https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId={i}&q=a&hasImages=true";

                    HttpResponseMessage searchResponse = await client.GetAsync(category); // call api
                    
                        string searchResponseContent = await searchResponse.Content.ReadAsStringAsync(); // read as str

                        dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(searchResponseContent); // deserialize json

                        if (result?.objectIDs != null && result.objectIDs.Count > 0) // not null and ther's 1 or more objects
                        {
                            Random random = new Random();
                            int randomObjectId = result.objectIDs[random.Next(result.objectIDs.Count)]; // select random objects

                            string objectDetailsUrl = $"{objectUrl}/{randomObjectId}"; 
                            //https://collectionapi.metmuseum.org/public/collection/v1/objects/+objectID"

                            HttpResponseMessage objectResponse = await client.GetAsync(objectDetailsUrl); // call api
                            
                            string objectResponseContent = await objectResponse.Content.ReadAsStringAsync(); // read as string

                            dynamic objectDetails = Newtonsoft.Json.JsonConvert.DeserializeObject(objectResponseContent); // deserialize jsno

                                ArtCategory artCategory = new ArtCategory // new instance of ArtCategory and assign atributes
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

                                artCategories.Add(artCategory); // add such piece to the list
                            
                        }
                    
                }
            }

            return View(artCategories); // return list to the view
        }
    }
}

