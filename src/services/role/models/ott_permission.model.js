class OttPermission {
  constructor(name, permission, onOff, onOffChild, state) {
    this.name = [
      {
        lang: 'en',
        name,
      },
    ];
    this.permission = permission;
    this.onOff = onOff;
    this.onOffChild = onOffChild;
    this.state = state;
  }

  export() {
    return {
      name: this.name,
      permission: this.permission,
      onOff: this.onOff,
      onOffChild: this.onOffChild,
      state: this.state,
    };
  }
}

module.exports = OttPermission;
