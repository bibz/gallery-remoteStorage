(function() {

    /*
     * HELPERS FUNCTIONS
     */

    function dump(obj) {
        var out = '';
        for (var i in obj) {
            out += i + ": " + obj[i] + "\n";
        }
        var pre = document.createElement('pre');
        pre.innerHTML = out;
        document.body.appendChild(pre)
    }

    /**
     * Remove every children of a DOM element.
     */
    function removeChildrenOf(domElement) {
        while (domElement.firstChild)
            domElement.removeChild(domElement.firstChild);
    }

    /**
     * Show an element.
     * This function relies on the .hidden class defined in the stylesheets.
     */
    function showElement(domElement, show=true) {
        if (show)
            domElement.classList.remove('hidden');
        else
            domElement.classList.add('hidden');
    }

    /**
     * Hide an element.
     * This function relies on the .hidden class defined in the stylesheets.
     */
    function hideElement(domElement) {
        showElement(domElement, false);
    }

    /*
     * GLOBAL VARIABLES
     */

    var albumPrefix = 'album-';
    var picturePrefix = 'picture-';
    var thumbsSuffix = '-thumbs-h200';

    var overlayDisconnectedElement;
    var overlayAlbumsEmptyElement;
    var overlayAlbumEmptyElement;
    var albumsContainerElement;
    var albumContainerElement;
    var navRootElement;

    var albums = [];

    function domifyAlbumName(albumName) {
        return albumPrefix + encodeURIComponent(albumName);
    }
    function undomifyAlbumName(prefixedAlbumName) {
        return decodeURIComponent(prefixedAlbumName.substr(0, albumPrefix.length));
    }

    /**
     * Update the navigation bar.
     * The navigation bar contains a link to the albums list and another one to
     *  the current album name (if any).
     */
    function updateNavigation(album=null) {
        // remove any extra link
        if (navRootElement.nextSibling)
            navRootElement.parentElement.removeChild(navRootElement.nextSibling);

        if (album) {
            var navAlbumLink = document.createElement('a');
            navAlbumLink.href = '#!/' + encodeURIComponent(album.name);
            navAlbumLink.innerHTML = album.name;

            var navExtraElement = document.createElement('span');
            navExtraElement.appendChild(document.createTextNode(' → '));
            navExtraElement.appendChild(navAlbumLink);

            navRootElement.parentElement.appendChild(navExtraElement);
        }
    }

    /**
     * Display the albums.
     * If there are no albums, show the empty overlay.
     */
    function displayAlbums() {
        showElement(overlayAlbumsEmptyElement, !albums||albums.length==0);
        showElement(albumsContainerElement);

        hideElement(albumContainerElement);
        clearAlbum();

        if (!albums||albums.length==0) return;

        albums.forEach(populateAlbumsWith);
    }

    /**
     * Populate the albums with an album.
     */
    function populateAlbumsWith(album) {
        var domAlbum = domifyAlbumName(album.name);
        var albumElement = document.getElementById(domAlbum);

        if (!albumElement) {
            albumElement = document.createElement('div');
            albumElement.id = domAlbum;
            albumElement.classList.add('album');
            albumsContainerElement.appendChild(albumElement);
        } else
            removeChildrenOf(albumElement);


        var albumCoverImageElement = document.createElement('img');
        albumCoverImageElement.src = 'img/missing-cover.png'; // TODO cover in module
        var albumCoverElement = document.createElement('div');
        albumCoverElement.classList.add('cover');
        albumCoverElement.appendChild(albumCoverImageElement);

        var albumTitleElement = document.createElement('h3');
        albumTitleElement.innerHTML = album.name;

        var albumLinkElement = document.createElement('a');
        albumLinkElement.href = '#!/'+album.name;
        albumLinkElement.album = album;
        albumLinkElement.onclick = function(){displayAlbum(this.album);};
        albumLinkElement.appendChild(albumCoverElement);
        albumLinkElement.appendChild(albumTitleElement);

        albumElement.appendChild(albumLinkElement);
    }

    /**
     * Display an album.
     * If the album is empty, show the empty-album overlay.
     */
    function displayAlbum(album) {
        showElement(overlayAlbumEmptyElement);
        showElement(albumContainerElement);

        // do not clear the albums container but only hide it
        hideElement(albumsContainerElement);

        // retrieve album
        album = remoteStorage.pictures.openPublicAlbum(album.name);
        updateNavigation(album);

        // ! COMMENTED OUT ! //
        //   Reasons are 1) the description is not available in the pictures
        //    module yet and 2) a fix has to be found w.r.t. the aside block
        //    size and the pictures size (e.g. different line heights).
        // set the album title and description
        //~ var albumTitleElement = document.createElement('h3');
        //~ albumTitleElement.innerHTML = album.name;
        //~ var albumDescElement = document.createElement('p');
        //~ albumDescElement.innerHTML = '<em>No description in the current <em>pictures</em> module.</em>';

        //~ var albumAsideElement = document.createElement('aside');
        //~ albumAsideElement.appendChild(albumTitleElement);
        //~ albumAsideElement.appendChild(albumDescElement);

        //~ albumContainerElement.appendChild(albumAsideElement);

        var albumPicturesElement = document.createElement('div');
        albumPicturesElement.classList.add('pictures');

        albumContainerElement.appendChild(albumPicturesElement);

        // browse the pictures
        album.list().then(function(pictures){
            hideElement(overlayAlbumEmptyElement);

            pictures.forEach(function(pictureName){
                populateAlbumWith(pictureName, album);
            });
        });
    }

    /**
     * Populate the album with a picture.
     */
    function populateAlbumWith(pictureName, album) {
        var pictureImageElement = document.createElement('img');
        pictureImageElement.src = album.getPictureURL(pictureName);
        pictureImageElement.title = pictureName;

        // TODO loading thumb...

        var pictureLinkElement = document.createElement('a');
        pictureLinkElement.href = album.getPictureURL(pictureName);
        pictureLinkElement.appendChild(pictureImageElement);

        var pictureElement = document.createElement('div');
        pictureElement.classList.add('picture');
        pictureElement.appendChild(pictureLinkElement);
        // TODO picture-h picture-s picture-v, resizing the img frame

        albumContainerElement.getElementsByClassName('pictures')[0].appendChild(pictureElement);
    }

    /**
     * Clear the displayed album container.
     * DOM objects are removed.
     */
    function clearAlbum() {
        // destroy DOM elements
        removeChildrenOf(albumContainerElement);
    }

    /**
     * Clear all (displayed) albums.
     * First clear the album displayed (if one), then the albums. Both DOM and
     *  javascript objects are destroyed.
     */
    function clearAllAlbums() {
        clearAlbum();

        // destroy DOM elements
        removeChildrenOf(albumsContainerElement);

        // destroy javascript elements
        albums = [];
    }

    /**
     * Initialize the albums retrieval.
     */
    function initAlbums(albumNames) {
        albumNames.forEach(function(name){
            var album = {};
            album.name = name;
            albums.push(album);
        });

        // display the albums
        displayAlbums();
    }

    /**
     * Initialize the application.
     */
    function init() {
        /* containers */
        overlayDisconnectedElement = document.getElementById('overlay-disconnected');
        overlayAlbumsEmptyElement = document.getElementById('overlay-albums-empty');
        overlayAlbumEmptyElement = document.getElementById('overlay-album-empty');
        albumsContainerElement = document.getElementById('albums-container');
        albumContainerElement = document.getElementById('album-container');

        /* navigation */
        navRootElement = document.getElementById('nav-root');
        navRootElement.onclick = displayAlbums;

        remoteStorage.enableLog();
        remoteStorage.access.claim('pictures', 'r');
        remoteStorage.displayWidget('RS-widget');

        remoteStorage.on('features-loaded', function(){
            remoteStorage.on('disconnect', function() {
                showElement(overlayDisconnectedElement);
                hideElement(albumsContainerElement);
                hideElement(albumContainerElement);

                clearAllAlbums();
            });
        });
        remoteStorage.on('ready', function(){
            // TODO loading...
            hideElement(overlayDisconnectedElement);

            //remoteStorage.pictures.listPrivateAlbums().then(displayAlbums);
            remoteStorage.pictures.listPublicAlbums().then(initAlbums);
        });
    }

    document.addEventListener('DOMContentLoaded', init);

})();
