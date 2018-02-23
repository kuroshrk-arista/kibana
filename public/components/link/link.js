import React from 'react';
import PropTypes from 'prop-types';

const isModifiedEvent = ev => !!(ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey);

export class Link extends React.PureComponent {
  static propTypes = {
    target: PropTypes.string,
    onClick: PropTypes.func,
    name: PropTypes.string.isRequired,
    params: PropTypes.object,
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]).isRequired,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  navigateTo = (name, params) => ev => {
    if (this.props.onClick) this.props.onClick(ev);

    if (
      !ev.defaultPrevented && // onClick prevented default
      ev.button === 0 && // ignore everything but left clicks
      !this.props.target && // let browser handle "target=_blank" etc.
      !isModifiedEvent(ev) // ignore clicks with modifier keys
    ) {
      ev.preventDefault();
      this.context.router.navigateTo(name, params);
    }
  };

  render() {
    try {
      const { name, params, children, ...linkArgs } = this.props;
      const { router } = this.context;
      const href = router.getFullPath(router.create(name, params));
      const props = {
        ...linkArgs,
        href,
        onClick: this.navigateTo(name, params),
      };

      return <a {...props}>{children}</a>;
    } catch (e) {
      console.error(e);
      return <div>LINK ERROR: {e.message}</div>;
    }
  }
}
