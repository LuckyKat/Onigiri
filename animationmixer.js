/**
 * Helper module for mixing animations with different weights
 * @moduleName AnimationMixer
 */
bento.define('onigiri/animationmixer', [
    'bento/utils',
    'onigiri/onigiri',
    'bento/tween'
], function(
    Utils,
    Onigiri,
    Tween
) {
    'use strict';
    /* @snippet AnimationMixer()|Constructor
    AnimationMixer({
        object3D: ${1},
        defaultAnimation: '${2}',
        defaultAnimationWeight: 0,
        loopAnimations: true
    }) */
    var AnimationMixer = function(settings) {
        // --- Parameters ---
        var targetObject3D = settings.object3D;
        var playOnStart = settings.playOnStart || [];
        var onAnimationFinished = settings.onAnimationFinished;
        var afterUpdate = settings.afterUpdate;

        // --- Variables ---
        var mixer;
        var currentAnimationSpeed = 1;
        var actions = {};
        var actionInfo = {};

        // --- Functions ---
        var processAnimations = function() {
            Utils.forEach(targetObject3D.animations, function(animation, i) {
                var lastIndex = animation.name.lastIndexOf('|') + 1;
                var animationName = animation.name.substring(lastIndex);
                if (animationName && !animation[animationName]) {
                    actions[animationName] = mixer.clipAction(targetObject3D.animations[i]);
                    actions[animationName].setEffectiveWeight(1);
                    actions[animationName].setEffectiveTimeScale(1);
                    actions[animationName].setLoop(THREE.LoopOnce, Infinity);
                    actions[animationName].clampWhenFinished = true;
                    actionInfo[animationName] = {
                        weight: 1,
                        speed: 1,
                        loop: false
                    };
                }
            });
        };
        var handleAnimationFinished = function(e) {
            var data = {
                action: e.action,
                mixer: e.target,
                clip: e.action.getClip()
            };
            if (onAnimationFinished) {
                onAnimationFinished(data);
            }
        };
        var setCurrentTime = function(timeInSeconds) {
            if (!mixer) {
                return;
            }
            mixer.time = 0; // Zero out time attribute for AnimationMixer object;
            for (var i = 0; i < mixer._actions.length; i++) {
                mixer._actions[i].time = 0; // Zero out time attribute for all associated AnimationAction objects.
            }
            return mixer.update(timeInSeconds); // Update used to set exact time. Returns "this" AnimationMixer object.
        };
        var setAnimationWeight = function(animationName, weight) {
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
        var setAnimationTime = function(animationName, time) {
            if (!mixer) {
                return;
            }
            //does the animation exist
            var animationClip = actions[animationName];
            if (animationClip) {
                actions[animationName].time = time;
            }
        };
        var setAnimationSpeed = function(animationName, speed) {
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
        var setAnimationLoop = function(animationName, loop) {
            if (!mixer) {
                return;
            }
            //does the animation exist
            var animationClip = actions[animationName];
            if (animationClip) {
                actions[animationName].setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
                actionInfo[animationName].loop = loop;
            }
        };

        // --- Component ---
        var mixerComponent = {
            name: 'mixerComponent',
            start: function(data) {
                mixer.addEventListener('finished', handleAnimationFinished);
            },
            destroy: function() {
                mixer.removeEventListener('finished', handleAnimationFinished);
            },
            update: function(data) {
                if (!mixer) {
                    return;
                }
                // update the animation
                mixer.update((1 / 60) * currentAnimationSpeed * data.speed);
                if (afterUpdate) {
                    afterUpdate();
                }
            },
            /**
             * @snippet #AnimationMixer.hasAnimation()|Boolean
            hasAnimation('$1')
             */
            hasAnimation: function(animation) {
                return Utils.isDefined(actions[animation]);
            },
            /**
             * @snippet #AnimationMixer.getAnimations()|Array
            getAnimations()
             */
            getAnimations: function() {
                return actions;
            },
            /**
             * @snippet #AnimationMixer.getActionInfo()|Object
            getActionInfo()
             */
            getActionInfo: function(name) {
                return actionInfo[name];
            },
            /**
             * @snippet #AnimationMixer.setAllTime()|Number
            setAllTime()
             */
            setAllTime: setCurrentTime,
            /**
             * @snippet #AnimationMixer.setWeight()|Snippet
            setWeight('${1:name}', ${2:1})
             */
            setWeight: setAnimationWeight,
            /**
             * @snippet #AnimationMixer.setTime()|Snippet
            setTime('${1:name}', ${2:0})
             */
            setTime: setAnimationTime,
            /**
             * @snippet #AnimationMixer.setSpeed()|Snippet
            setSpeed('${1:name}', ${2:0})
             */
            setSpeed: setAnimationSpeed,
            /**
             * @snippet #AnimationMixer.setLoop()|Snippet
            setLoop('${1:name}', ${2:0})
             */
            setLoop: setAnimationLoop,
            /**
             * @snippet #AnimationMixer.play()|Snippet
            play('${1:name}')
             */
            play: function(name, resetTime) {
                if (resetTime) {
                    actions[name].reset();
                }
                actions[name].play();
            },
            /**
             * @snippet #AnimationMixer.crossFade()|Snippet
            crossFade('${1:name}', ${2:0}, ${3:function () {}})
             */
            crossFade: function(to, overTime, onComplete) {
                actions[to].reset();
                actions[to].play();
                new Tween({
                    from: 0,
                    to: 1,
                    in: overTime,
                    ease: 'linear',
                    onUpdate: function(v, t) {
                        Utils.forEach(Object.keys(actions), function(actionName, i, l, breakLoop) {
                            if (actionName === to) {
                                return;
                            }
                            setAnimationWeight(actionName, Math.min(1 - v, actionInfo[actionName].weight));
                        });
                        setAnimationWeight(to, Math.max(v, actionInfo[to].weight));
                    },
                    onComplete: onComplete
                });
            },
            /**
             * @snippet #AnimationMixer.stop()|Snippet
            stop('${1:name}')
             */
            stop: function(name) {
                actions[name].stop();
            },
            /**
             * @snippet #AnimationMixer.clear()|Snippet
            clear()
             */
            clear: function() {
                mixer.stopAllAction();
            }
        };

        // Setup
        if (targetObject3D) {
            if (targetObject3D.animations) {
                //make a new animation mixer

                mixer = new THREE.AnimationMixer(targetObject3D);
                //create a list of animations
                processAnimations();

                //if we have a default animation enable it
                Utils.forEach(playOnStart, function(animation, i, l, breakLoop) {
                    mixerComponent.play(animation);
                });
            } else {
                Utils.log('Onigiri.Animator: No animations on Object3D!');
            }
        } else {
            Utils.log('Onigiri.Animator: No Object3D!');
        }

        return mixerComponent;
    };
    AnimationMixer.addToOnigiri = function() {
        Onigiri.AnimationMixer = AnimationMixer;
        console.log("Onigiri: added Onigiri.AnimationMixer");
    };
    return AnimationMixer;
});