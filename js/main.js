(function() {

    /*
     * HELPERS FUNCTIONS
     */

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
    function showElement(domElement) {
        domElement.classList.remove('hidden');
    }

    /**
     * Hide an element.
     * This function relies on the .hidden class defined in the stylesheets.
     */
    function hideElement(domElement) {
        domElement.classList.add('hidden');
    }

    /*
     * CLASSES
     */

    // contructor
    _Album = function(name, scope) {
        this.name = name;
        this.scope = scope;
    };
    // public interface
    _Album.prototype = {
        /**
         * Effectively retrieve the remote album.
         */
        retrieve: function() {
            var remoteAlbum;

            if (this.scope === 'private')
                remoteAlbum = remoteStorage.pictures.openPrivateAlbum(this.name);
            else
                remoteAlbum = remoteStorage.pictures.openPublicAlbum(this.name);

            // merge this instance with the remote album
            for (var key in remoteAlbum)
                this[key] = remoteAlbum[key];
        }
    };

    /*
     * GLOBAL VARIABLES
     */

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
    function updateNavigation(album) {
        // remove any extra link
        if (navRootElement.nextSibling)
            navRootElement.parentElement.removeChild(navRootElement.nextSibling);

        if (album) {
            var navAlbumLink = document.createElement('a');
            navAlbumLink.href = '#!/' + encodeURIComponent(album.name) + '/';
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

        // show the empty albums overlay
        showElement(overlayAlbumsEmptyElement);
        hideElement(overlayAlbumEmptyElement);

        // ensure that the app is shown
        showElement(appContainerElement);
        hideElement(overlayDisconnectedElement);

        if (!albums||albums.length==0) return;
        hideElement(overlayAlbumsEmptyElement);

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
        albumLinkElement.href = '#!/' + encodeURIComponent(album.name) + '/';
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

        // show the empty album overlay
        showElement(overlayAlbumEmptyElement);
        hideElement(overlayAlbumsEmptyElement);

        // ensure that app is shown
        showElement(appContainerElement);
        hideElement(overlayDisconnectedElement);

        // retrieve the album
        album.retrieve();

        // update the navigation bar
        updateNavigation(album);

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

        var pictureLinkElement = document.createElement('a');
        pictureLinkElement.href = album.getPictureURL(pictureName);
        pictureLinkElement.appendChild(pictureImageElement);

        var pictureElement = document.createElement('div');
        pictureElement.classList.add('picture');
        pictureElement.appendChild(pictureLinkElement);

        containerElement.appendChild(pictureElement);
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
    function initAlbums(albumNames, scope) {
        albumNames.forEach(function(name){
            albums.push(new _Album(name, scope));
        });

        // TODO call only once (for both private and public)
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

            //remoteStorage.pictures.listPrivateAlbums().then(initAlbums);
            remoteStorage.pictures.listPublicAlbums().then(function(albums){
                initAlbums(albums, 'public');
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);

})();
