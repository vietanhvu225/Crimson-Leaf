/** Body measurements and animation values of one enemy, shared by the gear/weapon drawers. */
export interface EnemyPose {
  headCenterY: number;
  headR: number;
  torsoW: number;
  torsoTop: number;
  frontHandX: number;
  frontHandY: number;
  legR: number;
  swingOffset: number;
  totalH: number;
  isBoss: boolean;
  primaryTrim: string;
}
