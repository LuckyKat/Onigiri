/**
 * Helper module for mixing animations with different weights
 * @moduleName AnimationMixer
 */
bento.define('onigiri/animationmixer', [
    'bento/utils',
    'onigiri/onigiri'
], function (
    Utils,
    Onigiri
) {
    'use strict';
    /* @snippet AnimationMixer()|Constructor
    AnimationMixer({
        object3D: ${1},
        defaultAnimation: '${2}',
        defaultAnimationWeight: 0,
        loopAnimations: true
    }) */
    var AnimationMixer = function (settings) {
        // --- Parameters ---
        var targetObject3D = settings.object3D;
        var defaultAnimation = settings.defaultAnimation;
        var defaultAnimationWeight = settings.defaultAnimationWeight || 0;
        var defaultAnimationSpeed = settings.defaultAnimationSpeed || 1;
        var loopAnimations = Utils.getDefault(settings.loopAnimations, true);

        // --- Variables ---
        var mixer;
        var currentAnimationSpeed = 1;
        var actions = {};
        var actionInfo = {};

        // --- Functions ---
        var processAnimations = function () {
            Utils.forEach(targetObject3D.animations, function (animation, i) {
                var lastIndex = animation.name.lastIndexOf('|') + 1;
                var animationName = animation.name.substring(lastIndex);
                if (animationName && !animation[animationName]) {
                    actions[animationName] = mixer.clipAction(targetObject3D.animations[i]);
                    actions[animationName].setEffectiveWeight(defaultAnimationWeight);
                    actions[animationName].setEffectiveTimeScale(defaultAnimationSpeed);
                    actions[animationName].setLoop(loopAnimations ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
                    actions[animationName].clampWhenFinished = true;
                    actionInfo[animationName] = {
                        weight: defaultAnimationWeight,
                        speed: defaultAnimationSpeed
                    };
                    actions[animationName].play();
                }
            });
        };
        var setCurrentTime = function (timeInSeconds) {
            if (!mixer) {
                return;
            }
            mixer.time = 0; // Zero out time attribute for AnimationMixer object;
            for (var i = 0; i < mixer._actions.length; i++) {
                mixer._actions[i].time = 0; // Zero out time attribute for all associated AnimationAction objects.
            }
            return mixer.update(timeInSeconds); // Update used to set exact time. Returns "this" AnimationMixer object.
        };
        var setAnimationWeight = function (animationName, weight) {
            if (!mixer) {
                return;
            }
            //does the animation exist
            var animationClip = actions[animationName];
            if (animationClip) {
                actions[animationName].setEffectiveWeight(weight);
                actionInfo[animationName].weight = weight;
            }
        };
        var setAnimationTime = function (animationName, time) {
            if (!mixer) {
                return;
            }
            //does the animation exist
            var animationClip = actions[animationName];
            if (animationClip) {
                actions[animationName].time = time;
            }
        };
        var setAnimationSpeed = function (animationName, speed) {
            if (!mixer) {
                return;
            }
            //does the animation exist
            var animationClip = actions[animationName];
            if (animationClip) {
                actions[animationName].setEffectiveTimeScale(speed);
                actionInfo[animationName].speed = speed;
            }
        };

        // --- Component ---
        var mixerComponent = {
            name: 'mixerComponent',
            start: function (data) {
                // find the relevant object3D if it doesn't exist
                if (!targetObject3D) {
                    targetObject3D = this.parent.object3D;
                }
                if (targetObject3D.animations) {
                    //make a new animation mixer
                    mixer = new THREE.AnimationMixer(targetObject3D);
                    //create a list of animations
                    processAnimations();
                    //if we have a default animation enable it
                    if (defaultAnimation && this.hasAnimation(defaultAnimation)) {
                        setAnimationWeight(defaultAnimation, 1, true);
                    }
                } else {
                    Utils.log('Onigiri.Animator: No animations on Object3D!');
                }
            },
            update: function (data) {
                if (!mixer) {
                    return;
                }
                // update the animation
                mixer.update((1 / 60) * currentAnimationSpeed * data.speed);
            },
            /**
             * @snippet #AnimationMixer.hasAnimation()|Boolean
            hasAnimation('$1')
             */
            hasAnimation: function (animation) {
                return Utils.isDefined(actions[animation]);
            },
            /**
             * @snippet #AnimationMixer.getAnimations()|Array
            getAnimations()
             */
            getAnimations: function () {
                return actions;
            },
            /**
             * @snippet #AnimationMixer.getCurrentTime()|Number
            getCurrentTime()
             */
            setCurrentTime: setCurrentTime,
            /**
             * @snippet #AnimationMixer.setAnimationWeight()|Snippet
            setAnimationWeight('${1:name}', ${2:1})
             */
            setAnimationWeight: setAnimationWeight,
            /**
             * @snippet #AnimationMixer.setAnimationTime()|Snippet
            setAnimationTime('${1:name}', ${2:0})
             */
            setAnimationTime: setAnimationTime,
            /**
             * @snippet #AnimationMixer.setAnimationSpeed()|Snippet
            setAnimationSpeed('${1:name}', ${2:0})
             */
            setAnimationSpeed: setAnimationSpeed,
            /**
             * @snippet #AnimationMixer.play()|Snippet
            play('${1:name}')
             */
            play: function (name) {
                actions[name].play();
            },
            /**
             * @snippet #AnimationMixer.stop()|Snippet
            stop('${1:name}')
             */
            stop: function (name, resetTime) {
                actions[name].stop();
                if (resetTime) {
                    setAnimationTime(name, 0);
                }
            },
            /**
             * @snippet #AnimationMixer.clear()|Snippet
            clear()
             */
            clear: function () {
                mixer.stopAllAction();
            }
        };
        return mixerComponent;
    };
    AnimationMixer.addToOnigiri = function () {
        Onigiri.AnimationMixer = AnimationMixer;
        console.log("Onigiri: added Onigiri.AnimationMixer");
    };
    return AnimationMixer;
});