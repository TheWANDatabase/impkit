export class CondaEnvironment {
  public name: string;
  public path: string;
  public active: boolean;
  public isImpkitEnvironment: boolean;

  constructor(name: string, path: string, active: boolean = false) {
    this.name = name;
    this.path = path;
    this.active = active;
    this.isImpkitEnvironment = /^ik_[\d]{13}$/.test(this.name);
  }

  public static fromCMD(line: string): CondaEnvironment {
    let pieces = line.split(" ").filter((part) => part.length > 0);

    if (pieces[1] === "*") {
      return new CondaEnvironment(pieces[0], pieces[2], true);
    } else {
      return new CondaEnvironment(pieces[0], pieces[1], true);
    }
  }
}
