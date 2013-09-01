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
    var appContainerElement;
    var containerElement;
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
        // clear the container
        removeChildrenOf(containerElement);

        // show the empty albums overlay if needed
        showElement(overlayAlbumsEmptyElement, !albums||albums.length==0);
        hideElement(overlayAlbumEmptyElement);
        showElement(containerElement);

        // ensure that app is shown
        showElement(appContainerElement);
        hideElement(overlayDisconnectedElement);

        if (!albums||albums.length==0) return;

        // populate the albums
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
            containerElement.appendChild(albumElement);
        } else
            removeChildrenOf(albumElement);

        var albumTitleElement = document.createElement('h3');
        albumTitleElement.innerHTML = album.name;

        var albumLinkElement = document.createElement('a');
        albumLinkElement.href = '#!/'+album.name;
        albumLinkElement.album = album;
        albumLinkElement.onclick = function(){displayAlbum(this.album);};
        albumLinkElement.appendChild(albumTitleElement);

        albumElement.appendChild(albumLinkElement);
    }

    /**
     * Display an album.
     * If the album is empty, show the empty-album overlay.
     */
    function displayAlbum(album) {
        // clear the container
        removeChildrenOf(containerElement);

        // show the empty album overlay by default
        showElement(overlayAlbumEmptyElement);
        hideElement(overlayAlbumsEmptyElement);
        showElement(containerElement);

        // ensure that app is shown
        showElement(appContainerElement);
        hideElement(overlayDisconnectedElement);

        // retrieve the album
        album = album.retrieve();

        // update the navigation bar
        updateNavigation(album);

        // populate the albums

        var albumPicturesElement = document.createElement('div');
        albumPicturesElement.classList.add('pictures');
        containerElement.appendChild(albumPicturesElement);

        // browse the pictures
        album.list().then(function(pictures){
            hideElement(overlayAlbumEmptyElement);

            pictures.forEach(function(pictureName){
                populateAlbumWith(pictureName, album, albumPicturesElement);
            });
        });
    }

    /**
     * Populate the album with a picture.
     */
    function populateAlbumWith(pictureName, album, pictureContainer) {
        var pictureImageElement = document.createElement('img');
        pictureImageElement.src = album.getPictureURL(pictureName);
        pictureImageElement.title = pictureName;

        var pictureLinkElement = document.createElement('a');
        pictureLinkElement.href = album.getPictureURL(pictureName);
        pictureLinkElement.appendChild(pictureImageElement);

        var pictureElement = document.createElement('div');
        pictureElement.classList.add('picture');
        pictureElement.appendChild(pictureLinkElement);

        pictureContainer.appendChild(pictureElement);
    }

    /**
     * Clear all albums.
     * First clear the DOM elements and then the javascript objects.
     */
    function clearAllAlbums() {
        // destroy DOM elements
        removeChildrenOf(containerElement);

        // destroy javascript elements
        albums = [];
    }

    /**
     * Initialize the albums.
     */
    function initAlbums(albumNames, scope='private') {
        albumNames.forEach(function(name){
            var album = {};
            album.name = name;
            album.scope = scope;
            album.retrieve = function(){
                if (scope === 'private')
                    return remoteStorage.pictures.openPrivateAlbum(album.name);
                else
                    return remoteStorage.pictures.openPublicAlbum(album.name);
            };
            albums.push(album);
        });
    }

    /**
     * Initialize the application.
     */
    function init() {
        /* containers */
        overlayDisconnectedElement = document.getElementById('overlay-disconnected');
        overlayAlbumsEmptyElement = document.getElementById('overlay-albums-empty');
        overlayAlbumEmptyElement = document.getElementById('overlay-album-empty');
        appContainerElement = document.getElementById('app-container');
        containerElement = document.getElementById('pictures-container');

        /* navigation */
        navRootElement = document.getElementById('nav-root');
        navRootElement.onclick = displayAlbums;

        remoteStorage.enableLog();
        remoteStorage.access.claim('pictures', 'r');
        remoteStorage.displayWidget('RS-widget');

        remoteStorage.on('features-loaded', function(){
            remoteStorage.on('disconnect', function() {
                showElement(overlayDisconnectedElement);
                hideElement(containerElement);

                clearAllAlbums();
            });
        });
        remoteStorage.on('ready', function(){
            // TODO loading...

            remoteStorage.pictures.listPrivateAlbums().then(initAlbums);
            remoteStorage.pictures.listPublicAlbums().then(function(albums){
                initAlbums(albums, 'public');
            });

            // display the albums
            displayAlbums();
        });
    }

    document.addEventListener('DOMContentLoaded', init);

})();
