# Collabnb Sample Listing Photos

## Currently Used in Mobile App

### Listing 1: Glacier Prime Cabin (Lake Tahoe, CA)

**Image 1 (Main Hero)**  
`https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800`  
[View](https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800) | [HD Version](https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1920) | [4K Version](https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=3840)

**Image 2 (Gallery)**  
`https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800`  
[View](https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800) | [HD Version](https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920) | [4K Version](https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=3840)

**Image 3 (Gallery)**  
`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800`  
[View](https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800) | [HD Version](https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920) | [4K Version](https://images.unsplash.com/photo-1566073771259-6a8506099945?w=3840)

---

### Listing 2: Mountain View Lodge (Aspen, CO)

**Image 1 (Main Hero)**  
`https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800`  
[View](https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800) | [HD Version](https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920) | [4K Version](https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=3840)

---

## Download Instructions

### Get Higher Resolution Versions
Change the `?w=800` parameter to get different sizes:
- **Standard (800px)**: `?w=800` - Current app usage
- **HD (1920px)**: `?w=1920` - Good for web hero images
- **4K (3840px)**: `?w=3840` - High-res downloads/prints

### Direct Download URLs
```
https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1920&fm=jpg&q=90&dl=cabin-1.jpg
https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&fm=jpg&q=90&dl=cabin-2.jpg
https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&fm=jpg&q=90&dl=cabin-3.jpg
```

---

## Photo Details

### Photo ID: `photo-1587061949409-02df41d5e562`
- **Description**: Cozy cabin exterior with mountain views
- **Best for**: Hero images, main listing photo
- **Currently used in**: Glacier Prime Cabin (main), various galleries

### Photo ID: `photo-1520250497591-112f2f40a3f4`
- **Description**: Modern cabin/lodge architecture
- **Best for**: Secondary gallery images, listing cards
- **Currently used in**: Both listings (overlapping)

### Photo ID: `photo-1566073771259-6a8506099945`
- **Description**: Cabin interior/landscape view
- **Best for**: Gallery, interior shots, lifestyle photos
- **Currently used in**: Glacier Prime Cabin gallery

---

## Notes

- ✅ All photos sourced from [Unsplash](https://unsplash.com) (free to use)
- 📱 Currently implemented in `/apps/mobile/src/data/mockListings.js`
- 🌐 Web version uses placeholder URLs that need real photos
- 🎯 Recommended size for mobile app: **800px-1200px** width
- 💾 File location: Update images array in `MOCK_LISTINGS` constant

---

## How to Replace with Your Own Photos

Edit `/apps/mobile/src/data/mockListings.js`:

```javascript
images: [
  "https://your-cdn.com/photo1.jpg",
  "https://your-cdn.com/photo2.jpg",
  "https://your-cdn.com/photo3.jpg",
]
```
