using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MyArtPage.Categories
{
        public class ArtCategory
        {
            public int ObjectId { get; set; }
            public string? Title { get; set; }
            public string? PrimaryImage { get; set; }
            public string? Department { get; set; }
            public string? Culture { get; set; }
            public string? Period { get; set; }
            public string? Artist { get; set; }
            public string? Date { get; set; }
            public string? Link { get; set; }
        }
    }
