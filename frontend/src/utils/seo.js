export const updatePageMeta = ({ title, description, image, url }) => {
  // Update title
  if (title) {
    document.title = title;
  }

  // Update or create meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (description) {
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;
  }

  // Update or create og:title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (title) {
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;
  }

  // Update or create og:description
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (description) {
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.content = description;
  }

  // Update or create og:image
  let ogImage = document.querySelector('meta[property="og:image"]');
  if (image) {
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.content = image;
  }

  // Update or create og:url
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (url) {
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = url;
  }

  // Update or create og:type
  let ogType = document.querySelector('meta[property="og:type"]');
  if (!ogType) {
    ogType = document.createElement('meta');
    ogType.setAttribute('property', 'og:type');
    ogType.content = 'website';
    document.head.appendChild(ogType);
  }

  // Update or create twitter:card
  let twitterCard = document.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) {
    twitterCard = document.createElement('meta');
    twitterCard.name = 'twitter:card';
    twitterCard.content = 'summary_large_image';
    document.head.appendChild(twitterCard);
  }

  // Update or create twitter:title
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (title) {
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.name = 'twitter:title';
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.content = title;
  }

  // Update or create twitter:description
  let twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (description) {
    if (!twitterDescription) {
      twitterDescription = document.createElement('meta');
      twitterDescription.name = 'twitter:description';
      document.head.appendChild(twitterDescription);
    }
    twitterDescription.content = description;
  }

  // Update or create twitter:image
  let twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (image) {
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.name = 'twitter:image';
      document.head.appendChild(twitterImage);
    }
    twitterImage.content = image;
  }
};
