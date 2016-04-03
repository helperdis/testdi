//=============================================================================
// TMVplugin - 移動機能拡張
// 作者: tomoaky (http://hikimoki.sakura.ne.jp/)
// Version: 1.1
// 最終更新日: 2015/03/11
//=============================================================================

/*:
 * @plugindesc 壁衝突音やリージョンによる通行設定などの機能を追加します。
 * 
 * @author tomoaky (http://hikimoki.sakura.ne.jp/)
 *
 * @param passableRegionId
 * @desc タイルに関係なく通行を可能にするリージョン番号
 * 初期値: 251
 * @default 251
 *
 * @param dontPassRegionId
 * @desc タイルに関係なく通行を不可にするリージョン番号
 * 初期値: 252
 * @default 252
 *
 * @param seKnockWall
 * @desc 壁衝突効果音
 * 初期値: <name:Blow1><volume:90><pitch:100>
 * @default <name:Blow1><volume:90><pitch:100>
 *
 * @param knockWallPan
 * @desc 壁衝突効果音の左右バランス
 * 初期値: 75
 * @default 75
 *
 * @param knockWallInterval
 * @desc 壁衝突効果音の再生間隔（フレーム数）
 * 初期値: 30
 * @default 30
 *
 * @param turnKeyCode
 * @desc その場で向き変更に使うキー
 * 初期値: 83
 * @default 83
 *
 * @help
 * 使い方:
 *   Ｓキーを押しながら方向キーを押すと、移動せずにプレイヤーの向きだけを
 *   変えることができます。マウス（タップ）操作の場合はプレイヤーがいる場所を
 *   クリックすることで、時計回りに９０度回転します。
 *
 *   その場で移動せずに向きを変更する機能で使用するキーは turnKeyCode の値を
 *   変更することで設定できます。65 ならＡ、66 ならＢ、とアルファベットが
 *   順に並んでいます、ＸやＺなど他の機能に割り当てられていないキーを設定して
 *   ください。
 *
 * プラグインコマンドはありません。
 * 
 */

var Imported = Imported || {};
Imported.TMMoveEx = true;

(function() {

  var parameters = PluginManager.parameters('TMMoveEx');
  var passableRegionId  = +parameters['passableRegionId'];
  var dontPassRegionId  = +parameters['dontPassRegionId'];
  var knockWallInterval = +parameters['knockWallInterval'];
  var knockWallPan      = +parameters['knockWallPan'];
  var re = /<name:(.+?)><volume:(.+?)><pitch:(.+?)>/;
  var match = re.exec(parameters['seKnockWall']);
  if (match) {
    var seKnockWall = {};
    seKnockWall.name   = match[1];
    seKnockWall.volume = +match[2];
    seKnockWall.pitch  = +match[3];
  } else {
    var seKnockWall = {name:'Blow1', volume:90, pitch:100};
  }
  Input.keyMapper[+parameters['turnKeyCode']] = 'turn';

  //-----------------------------------------------------------------------------
  // Game_Map
  //

  var _Game_Map_checkPassage = Game_Map.prototype.checkPassage;
  Game_Map.prototype.checkPassage = function(x, y, bit) {
    var regionId = this.regionId(x, y);
    if (regionId === passableRegionId) return true;
    if (regionId === dontPassRegionId) return false;
    return _Game_Map_checkPassage.call(this, x, y, bit);
  };

  //-----------------------------------------------------------------------------
  // Game_Player
  //

  var _Game_Player_moveStraight = Game_Player.prototype.moveStraight;
  Game_Player.prototype.moveStraight = function(d) {
    _Game_Player_moveStraight.call(this, d);
    if (!this.isMovementSucceeded()) {
      var x2 = $gameMap.roundXWithDirection(this.x, d);
      var y2 = $gameMap.roundYWithDirection(this.y, d);
      if (this.isNormal() && ($gameMap.boat().pos(x2, y2) || $gameMap.ship().pos(x2, y2))) {
        return;
      }
      if (this.isInVehicle() && this.vehicle().isLandOk(this.x, this.y, this.direction())) {
        return;
      }
      var d2 = this.reverseDir(d);
      if (!$gameMap.isPassable(this.x, this.y, d) || !$gameMap.isPassable(x2, y2, d2)) {
        this._knockWallCount = this._knockWallCount === undefined ? 0 : this._knockWallCount;
        if (this._knockWallCount + knockWallInterval <= Graphics.frameCount ||
            this._lastKnockWallDir !== d) {
          if (d === 4) {
            seKnockWall.pan = -knockWallPan;
          } else if (d === 6) {
            seKnockWall.pan = knockWallPan;
          } else {
            seKnockWall.pan = 0;
          }
          AudioManager.playSe(seKnockWall);
          this._knockWallCount = Graphics.frameCount;
          this._lastKnockWallDir = d;
        }
      }
    }
  };

  var _Game_Player_moveByInput = Game_Player.prototype.moveByInput;
  Game_Player.prototype.moveByInput = function() {
    if (!this.isMoving() && this.canMove()) {
      var direction = this.getInputDirection();
      if (Input.isPressed('turn') && direction > 0) {
        this.setDirection(direction);
        return;
      }
      if (TouchInput.isTriggered() && $gameTemp.isDestinationValid()) {
        var x = $gameTemp.destinationX();
        var y = $gameTemp.destinationY();
        if (this.pos(x, y)) {
          this.turnRight90();
          return;
        }
      }
    }
    _Game_Player_moveByInput.call(this);
  };

})();
