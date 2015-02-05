/*globals angular, console */

// create the module
var app = angular.module('diceApp', []);

app.constant('STARTING_DICE_COUNT', 5);

app.factory('DiceFactory', [ 'STARTING_DICE_COUNT', function(STARTING_DICE_COUNT) {
	return function(aCount) {
		var dices = [];
		var count = aCount || STARTING_DICE_COUNT;

		for (var i = 0; i < count; ++i) {
			dices[i] = Math.floor(Math.random() * (count + 1)) + 1;
		}

		return dices;
	};
} ]);

app.factory('PlayerFactory', [ 'DiceFactory', function(DiceFactory) {
	var playerCount = 0;

	function Player(aPlayerName) {
		this.id = playerCount++;

		this.name = aPlayerName || 'Player ' + playerCount;

		this.reroll();
	}

	Player.prototype.reroll = function() {
		this.dices = DiceFactory(this.dices && this.dices.length);
	};

	Player.prototype.removeDices = function(aCount) {
		if (aCount > this.dices.length) {
			this.dices.length = 0;
		} else {
			this.dices.length -= aCount;
		}
	};

	Player.prototype.hasDices = function() {
		return !!this.dices.length;
	};

	return function(aPlayerName) {
		return new Player(aPlayerName);
	};
} ]);

app.controller('DiceCtrl', [ "$scope", 'PlayerFactory', function($scope, playerFactory) {
	var range = function(aFrom, aTo) {
		var retval = [];

		for (var i = aFrom; i <= aTo; ++i) {
			retval.push(i);
		}

		return retval;
	};

	var initialBid = function() {
		return {
			face: 1,
			count: 1
		};
	};

	var playerIndex = function() {
		return $scope.players.indexOf($scope.currentPlayer);
	};

	var nextPlayer = function() {
		var idx = (playerIndex() + 1) % $scope.players.length;

		return $scope.players[idx];
	};

	var prevPlayer = function() {
		var players = $scope.players;
		var idx = (Math.max(playerIndex(), 0) + players.length - 1) % players.length;

		return players[idx];
	};

	var collectDiceCount = function(aFace) {
		return $scope.players
			.map(function(aPlayer) {
				if (!aFace) {
					return aPlayer.dices;
				}

				return aPlayer.dices.filter(function(aDice) {
					return aDice === aFace;
				});
			})
			.reduce(function(aAcc, aDices) {
				return aAcc + aDices.length;
			}, 0);
	};

	$scope.players = [];

	$scope.playerBid = initialBid();

	$scope.addPlayer = function(aPlayerName) {
		var player = playerFactory(aPlayerName);

		$scope.players.push(player);
	};

	$scope.removePlayer = function(aPlayer) {
		var idx = $scope.players.indexOf(aPlayer);

		if (idx < 0) {
			// todo: the player is no longer available
		} else {
			$scope.players.splice(idx, 1);
		}
	};

	$scope.startGame = function() {
		$scope.inGame = true;

		$scope.currentPlayer = $scope.currentPlayer || nextPlayer();
	};

	$scope.bidFaces = function() {
		return range(($scope.currentBid || { face: 1 }).face, 6);
	};

	$scope.bidCounts = function() {
		return range(($scope.currentBid || { count: 1 }).count, collectDiceCount());
	};

	$scope.isValidBid = function() {
		if (!$scope.playerBid) {
			return false;
		}

		if (!$scope.currentBid) {
			return true;
		}

		var df = $scope.playerBid.face - $scope.currentBid.face;
		var dc = $scope.playerBid.count - $scope.currentBid.count;

		// the bid face/count cannot be less than the current bid and at least one of the indexes should be higher
		return (dc >= 0 && df >= 0 && (dc + df) >= 1);
	};

	$scope.bid = function() {
		if (!$scope.isValidBid()) {
			return;
		}

		$scope.currentBid = angular.copy($scope.playerBid);
		$scope.currentPlayer = nextPlayer();
	};

	$scope.call = function() {
		if (!$scope.currentBid) {
			return;
		}

		var bidCount = $scope.currentBid.count;
		var diceCount = collectDiceCount($scope.currentBid.face);
		var delta = Math.abs(diceCount - bidCount);
		var previousPlayer = prevPlayer();

		if (bidCount > diceCount) {
			// remove delta points from previous player for false guesses
			previousPlayer.removeDices(delta);
		} else {
			if (bidCount === diceCount) {
				// remove one dice from each player except from the one who guessed it
				$scope.players
					.filter(function(aPlayer) {
						return aPlayer !== previousPlayer;
					})
					.forEach(function(aPlayer) {
						aPlayer.removeDices(1);
					});
			} else if (bidCount < diceCount) {
				// remove delta points from the current player for false accusations
				$scope.currentPlayer.removeDices(delta);
			} else {
				// we have a bug or a cheat :(
				console.error('Unexpected delta: ' + delta);
			}

			// make the previous player "current"
			$scope.currentPlayer = previousPlayer;
		}

		// remove players who have zero dices
		$scope.players = $scope.players
			.filter(function(aPlayer) {
				return aPlayer.hasDices();
			});

		if ($scope.players.length === 1) {
			// we have a winner
			$scope.winner = $scope.players[0];
			return;
		}

		// reroll the dices
		$scope.players.forEach(function(aPlayer) {
			aPlayer.reroll();
		});

		$scope.currentBid = null;
		$scope.playerBid = initialBid();
	};
} ]);










