/**
 * A wrapper for use of three.js nicely in Bento, it's called Onigiri because it has three sides, and wraps nice things (🍙!!)
 * @moduleName Onigiri
 */
bento.define('onigiri/onigiri', [
    'bento',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/math/vector2'
], function (
    Bento,
    Entity,
    EventSystem,
    Utils,
    Vector2
) {
    'use strict';
    var VERSION = "v1.0.5";

    // THREE object references
    var onigiriRenderer = null;
    var onigiriScene = null;
    var onigiriCamera = null;
    var onigiriEntity = null;

    // Texture References
    var backgroundTexture;
    var skyBox;
    var skyCubeMap;

    // Conversion variables
    var threeToPx = 128;
    var pxToThree = 1 / threeToPx;

    /* @snippet Onigiri()|Constructor
    Onigiri({
        threeToPx: 128,
        pxToThree: 1,
        gamma: 2.2,
        backgroundColor: ${1:0x70b0e4},
        camera: new Onigiri.Camera({
            style: '${2:perspective}', // or orthographic
            perspectiveFieldOfView: ${3:45},
            orthographicSize: ${4:15},
        }),
        shadows: ${4:false}
        // backgroundPath: 'path',
        // skyBox: ['path/positivex', 'path/negativex', 'path/positivey', 'path/negativey', 'path/positivez', 'path/negativex'],
        // fog: 0, // fog density
        // fogColor: 0xf0f0ff,
    })
    */
    var Onigiri = function (settings) {
        //TODO this creates a dependency that we're not too happy about. What is a good solution?
        var camera = settings.camera || new Onigiri.Camera({});

        var gamma = settings.gamma; // if undefined, scene will use linear color space.

        // get references
        var ThreeData = Bento.getRenderer().three;
        var isDebug = Bento.isDev();

        var component = new Object({
            name: 'behavior',
            start: function (data) {
                onigiriEntity = onigiri;

                ThreeData.sceneList.unshift({
                    scene: onigiriScene,
                    camera: camera.object3D,
                    gamma: gamma,
                });
                if (isDebug) {
                    EventSystem.on('buttonDown-home', printDebug);
                }
            },
            destroy: function (data) {
                onigiriEntity = null;
                ThreeData.sceneList.shift();
                if (isDebug) {
                    EventSystem.off('buttonDown-home', printDebug);
                }
                onigiriScene.dispose();
                if (skyCubeMap) {
                    skyCubeMap.dispose();
                }
                if (backgroundTexture) {
                    backgroundTexture.dispose();
                }
            }
        });
        /**
         * Main entity
         */
        var onigiri = new Entity({
            name: 'onigiri',
            components: [
                component
            ]
        });
        // Little function to toggle debug mode
        var printDebug = function () {
            console.log('THREE Info:\nMemory: ' + JSON.stringify(ThreeData.renderer.info.memory) +
                '\nObjects: ' + onigiriScene.children.length +
                '\nCamera:' + JSON.stringify({
                    position: Onigiri.camera.position,
                    rotation: Onigiri.camera.rotation
                })
            );
        };

        // set up conversion variables
        if (settings.threeToPx) {
            threeToPx = settings.threeToPx;
            pxToThree = 1 / settings.threeToPx;
        } else if (settings.pxToThree) {
            pxToThree = settings.pxToThree;
            threeToPx = 1 / settings.pxToThree;
        }

        // reset this as we're making a new one
        onigiriEntity = null;

        // collect the three renderer
        onigiriRenderer = ThreeData.renderer;

        // set up scene
        onigiriScene = new THREE.Scene();
        onigiriScene.add(camera.object3D);
        onigiri.attach(camera); //camera is an entity and needs to be updated

        Onigiri.scene = onigiriScene;
        Onigiri.camera = camera;
        Onigiri.renderer = onigiriRenderer;

        // fog
        if (settings.fogColor && settings.fog) {
            onigiriScene.fog = new THREE.FogExp2(settings.fogColor, settings.fog);
        }

        // background
        if (settings.skyBox) {
            setSkyBox(onigiriScene, settings.skyBox);
        } else if (settings.backgroundPath) {
            setBackgroundTexture(onigiriScene, settings.backgroundPath);
        } else if (settings.backgroundColor) {
            setBackgroundColor(onigiriScene, settings.backgroundColor);
        }

        if (settings.shadows) {
            // todo: add settings
            onigiriRenderer.shadowMap.enabled = true;
            onigiriRenderer.shadowMap.autoUpdate = true;
            onigiriRenderer.shadowMap.type = THREE.PCFShadowMap;
        }

        if (Bento.isDev()) {
            window.printDebug = printDebug;
        }

        return onigiri;
    };

    /**
     * Common functions
     */
    var setSkyBox = function (scene, pathList) {
        var img;
        skyCubeMap = new THREE.CubeTexture();
        skyBox = pathList;
        for (var i = 0; i < 6; i++) {
            img = Bento.assets.getImage(skyBox[i]);
            skyCubeMap.images[i] = img.image;
        }
        if (i === 6) {
            skyCubeMap.needsUpdate = true;
            scene.background = skyCubeMap;
        }
    };
    var setBackgroundTexture = function (scene, path) {
        var img = Bento.assets.getImage(path);
        backgroundTexture = new THREE.Texture(img.image);
        scene.background = new THREE.Color(backgroundTexture);
    };
    var setBackgroundColor = function (scene, color) {
        scene.background = new THREE.Color(color);
    };


    /* @snippet Onigiri.threeToPx|Number 
    Onigiri.threeToPx
    */
    Object.defineProperty(Onigiri, 'threeToPx', {
        get: function () {
            return threeToPx;
        },
        set: function (value) {
            threeToPx = value;
            pxToThree = 1 / value;
        }
    });

    /* @snippet Onigiri.pxToThree|Number 
    Onigiri.pxToThree
    */
    Object.defineProperty(Onigiri, 'pxToThree', {
        get: function () {
            return pxToThree;
        },
        set: function (value) {
            pxToThree = value;
            threeToPx = 1 / value;
        }
    });

    /* @snippet Onigiri.scene|THREE.Scene */
    Onigiri.scene = null;

    /* @snippet Onigiri.camera|THREE.Camera */
    Onigiri.camera = null;

    /* @snippet Onigiri.entity|Entity */
    Object.defineProperty(Onigiri, 'entity', {
        get: function () {
            return onigiriEntity;
        },
        set: function (value) {
            Utils.log("Onigiri: 'Onigiri.entity' is read only!");
        }
    });

    /* @snippet Onigiri.setBackground()|Snippet
    Onigiri.setBackground(${1:array/path/uint}); // optional: can pass the scene that you want to change
    */
    Onigiri.setBackground = function (background, scene) {
        if (Utils.isArray(background) && background.length === 6) { // cubemap
            setSkyBox(scene || onigiriScene, background);
        } else if (Utils.isString(background)) { // texture
            setBackgroundTexture(scene || onigiriScene, background);
        } else if (Utils.isNumber(background)) { // color
            setBackgroundColor(scene || onigiriScene, background);
        }
    };

    /**
     * Disposes all geometries 
     * @snippet Onigiri.cleanObject3d()|Snippet
    Onigiri.cleanObject3d(${1:object3D})
    */
    Onigiri.cleanObject3d = function (obj3d) {
        obj3d.children.forEach(function (mesh) {
            if (mesh.type !== 'Group') {
                // can only dispose of meshes
                if (mesh.type === 'Mesh') {
                    mesh.geometry.dispose();
                }
            } else {
                Onigiri.cleanObject3d(mesh);
            }
        });
    };

    /* @snippet Onigiri.getMesh()|THREE.Object3D
    Onigiri.getMesh('${1:path}')
    */
    Onigiri.getMesh = function (meshPath) {
        // check if mesh exists
        var mesh = Bento.assets.getMesh(meshPath);
        if (mesh) {
            return THREE.SkeletonUtils.clone(mesh);
        } else {
            if (!meshPath) {
                Utils.log('Onigiri: mesh path is undefined!');
            } else {
                Utils.log('Onigiri: mesh does not exist!');
            }
        }
    };

    /* Get a THREE texture by Bento image name.
     * Textures are cached on the image, in a way that's compatible with Bento's ThreeSprite
    Onigiri.getTexture('${1:imageName}', {$2})
    */
    Onigiri.getTexture = function (name, textureSettings) {
        var img = Bento.assets.getImage(name);
        if (img) {
            var texture = img.image.texture;
            if (!texture) {
                texture = new THREE.Texture(img.image);
                texture.flipY = false;
                if (textureSettings) {
                    Utils.forEach(textureSettings, function (value, key) {
                        texture[key] = value;
                    });
                }
                texture.needsUpdate = true;
                img.image.texture = texture;
            }
            return texture;
        } else {
            Utils.log('Onigiri: Can\'t get texture for nonexistant image "' + name + '"');
            return null;
        }
    };

    /* Searches all of the parents of a specified object3D to find an anchoring entity3D, useful for getting an entity3D from a raycast result
    @snippet Onigiri.findParentEntity3D()|Entity3D
    Onigiri.findParentEntity3D(${1:Object3D})
    */
    Onigiri.findParentEntity3D = function (object3D) {
        var thisObject3D = object3D;
        var thisEntity3D = thisObject3D.entity3D;

        // run over all parents, until we find an entity3D
        while (!thisEntity3D && thisObject3D.parent) {
            thisObject3D = thisObject3D.parent;
            thisEntity3D = thisObject3D.entity3D;
        }

        // we found an entity, return it
        if (thisEntity3D) {
            return thisEntity3D;
        } else {
            // assuming you're using the library correctly this shouldn't happen!
            Utils.log('Onigiri: No parent of this object3D has an assigned Entity3D!');
            return undefined;
        }
    };
    /**
     * @snippet Onigiri.getMeshSize()|THREE.Vector3
    Onigiri.getMeshSize(${1:object3D}))
     */
    Onigiri.getMeshSize = function (mesh) {
        var box = null;
        var size = new THREE.Vector3();
        mesh.traverse(function (obj3D) {
            var geometry = obj3D.geometry;
            if (geometry === undefined) {
                return;
            }
            geometry.computeBoundingBox();
            if (box === null) {
                box = geometry.boundingBox;
            } else {
                box.union(geometry.boundingBox);
            }
        });
        if (box === null) {
            return size;
        }
        box.getSize(size);
        return size;
    };

    /* 
    * Used to 'install' extensions into Onigiri, allowing you to perform 'Onigiri.ExtensionName({})' instead of defining everything in the require of the file
    * @snippet Onigiri.setup()|Snippet
    Onigiri.setup({
        extensions: [
            'onigiri/animationmixer',
            'onigiri/clickcaster',
            'onigiri/collider',
            'onigiri/entity3d',
            'onigiri/light',
            'onigiri/primitive',
        ],
        onComplete: function () {}
    }); 
    */
    Onigiri.setup = function (settings) {
        var extensions = settings.extensions;
        var onComplete = settings.onComplete || function () {};
        var end = function () {
            console.log("********************");
            onComplete();
        };
        console.log("********************");
        console.log("Onigiri 🍙 " + VERSION);
        if (extensions) {
            bento.require(extensions, function () {
                for (var i = 0, l = arguments.length; i < l; ++i) {
                    if (arguments[i].addToOnigiri) {
                        arguments[i].addToOnigiri();
                    }
                }
                end();
            });
        } else {
            end();
        }
    };

    /**
     * Projects a THREE.Vector3 to Bento world space
     * @snippet Onigiri.projectToBento()|Vector2
    Onigiri.projectToBento(${1:vector3})
     */
     Onigiri.projectToBento = function (threePos) {
        var cameraPosition = threePos.project(Onigiri.camera);
        var viewport = Bento.getViewport();
        var worldPosition = new Vector2(
            viewport.x + viewport.width / 2 + cameraPosition.x * viewport.width / 2,
            viewport.y + viewport.height / 2 - cameraPosition.y * viewport.height / 2
        );
        return worldPosition;
     };

    /* @snippet THREE.Vector2()|THREE.Vector2
    THREE.Vector2(${1:0}, ${2:0})
    */

    /* @snippet THREE.Vector3()|THREE.Vector3
    THREE.Vector3(${1:0}, ${2:0}, ${3:0})
    */

    /* @snippet THREE.MeshStandardMaterial|THREE.Material
    THREE.MeshStandardMaterial({
        color: '#ff00ff',
        roughness: 0.5,
        metalness: 0,
        transparent: true,
        opacity: 1,
        depthWrite: true,
        side: THREE.FrontSide,
        blending: THREE.NormalBlending
    })
    */
    return Onigiri;
});