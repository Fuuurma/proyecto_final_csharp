// using System.Diagnostics;
// using System.Net.Http;
// using System.Threading.Tasks;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.Extensions.Logging;
// using Newtonsoft.Json;
// using Newtonsoft.Json.Linq;


// namespace MyArtPage.Controllers
// {
//     public class HomeController : Controller
//     {
//         private readonly ILogger<HomeController> _logger;

//         public HomeController(ILogger<HomeController> logger)
//         {
//             _logger = logger;
//         }

//         public IActionResult Index()
//         {
//             return View();
//         }

//         public IActionResult Privacy()
//         {
//             return View();
//         }

//         [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
//         public IActionResult Error()
//         {
//             return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
//         }

//         public async Task<IActionResult> Artworks()
//         {
//             List<Artists> artists = new List<Artists>();
//             List<string> artistNames = new List<string> { "picasso", "monet", "gogh" };

//             foreach (string artistName in artistNames)
//             {
//                 List<int> objectIds = await GetArtistObjectIds(artistName);

//                 foreach (int objectId in objectIds)
//                 {
//                     Artists artwork = await GetArtworkData(objectId);
//                     artists.Add(artwork);
//                 }
//             }

//             return View(artists);
//         }

//         public async Task<List<int>> GetArtistObjectIds(string artistName)
//         {
//             string apiUrl = $"https://collectionapi.metmuseum.org/public/collection/v1/search?artistOrCulture=true&isHighlight=true&q={artistName}";

//             using (HttpClient client = new HttpClient())
//             {
//                 HttpResponseMessage response = await client.GetAsync(apiUrl);
//                 if (response.IsSuccessStatusCode)
//                 {
//                     string json = await response.Content.ReadAsStringAsync();
//                     dynamic data = JObject.Parse(json);
//                     List<int> objectIds = data.objectIDs.ToObject<List<int>>();
//                     return objectIds;
//                 }
//                 else
//                 {
//                     // Handle API error
//                     // Return empty list or throw an exception
//                     return new List<int>();
//                 }
//             }
//         }

//         public async Task<Artists> GetArtworkData(int objectId)
//         {
//             string apiUrl = $"https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectId}";

//             using (HttpClient client = new HttpClient())
//             {
//                 HttpResponseMessage response = await client.GetAsync(apiUrl);
//                 if (response.IsSuccessStatusCode)
//                 {
//                     string json = await response.Content.ReadAsStringAsync();
//                     dynamic data = JObject.Parse(json);

//                     Artists artwork = new Artists
//                     {
//                         ObjectId = objectId,
//                         Title = data.title,
//                         PrimaryImage = data.primaryImage,
//                         Department = data.department,
//                         Culture = data.culture,
//                         Period = data.period,
//                         Artist = data.artistDisplayName,
//                         Date = data.objectDate,
//                         Link = data.objectURL
//                     };

//                     return artwork;
//                 }
//                 else
//                 {
//                     // Handle API error
//                     // Return null or throw an exception
//                     return null;
//                 }
//             }
//         }
//     }
// }



// using System.Diagnostics;
// using Microsoft.AspNetCore.Mvc;

// using System.Net.Http;
// using System.Text.Json;
// using System.Threading.Tasks;
// // using Newtonsoft.Json;
// // using Newtonsoft.Json.Linq;
// // using Newtonsoft.Json.Serialization;
// // using Newtonsoft.Json.Converters;




// namespace MyArtPage.Controllers;

// public class HomeController : Controller
// {
    
//     private readonly ILogger<HomeController> _logger;
//     private readonly IHttpClientFactory _clientFactory;


//     public HomeController(ILogger<HomeController> logger, IHttpClientFactory clientFactory)
//     {
//         _logger = logger;
//         _clientFactory = clientFactory;
//     }




//     public IActionResult Index()
//     {
    
//     return View();

//     }


//     public IActionResult Privacy()
//     {
//         return View();
//     }

   
// }

