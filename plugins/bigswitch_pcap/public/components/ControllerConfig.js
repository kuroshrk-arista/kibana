import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSelect,
  EuiButtonIcon,
  EuiFormRow,
  EuiFieldText,
  EuiPopover
} from '@elastic/eui';

export class ControllerConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      isPopoverOpen: false,
      newController: '',
      removeController: this.props.selectedController
    };

    this.updateControllerDoc = this.updateControllerDoc.bind(this);

    // run query to elastic for the configured controllers
    this.getBMFControllers();
  }

  // takes the controllers presented in props, and puts them in the
  // correct format for EuiSelect
  formatControllers = () => {
    const res = [];
    this.props.controllers.forEach((controller) => {
      res.push({ value: controller, text: controller });
    });
    return res;
  };

  getBMFControllers = () => {
    this.props.BMFController.getDocElastic('dmf_controller')
      .then((res) => {
        if (res.data.results.body) {
          if (res.data.results.body.found) {
            this.props.updateControllerList(res.data.results.body._source.controllers);
            // set default selection once we loaded them in.
            this.setState({
              removeController: res.data.results.body._source.controllers[0]
            });
          } else {
            // console.log(res);
            // console.log('No config file exists');
          }
        }
      })
      .catch((err) => {
        // todo: handle error
        // console.log(err);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  onClickEdit = () => {
    this.setState({ isPopoverOpen: !this.state.isPopoverOpen });
  };

  closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  onChangeNewController = (e) => {
    this.setState({ newController: e.target.value });
  };

  async updateControllerDoc(controllers) {
    this.setState({ loading: true });

    const res = await this.props.BMFController.putDocElastic('dmf_controller', {
      controllers: controllers
    })
      .then((res) => {
        if (res.data.results.body) {
          // if one or more shards have it, it's successful
          if (res.data.results.body._shards.successful > 0) {
            return true;
          } else {
            // console.log('Failed to add new controller');
            return false;
          }
        }
      })
      .catch((err) => {
        return false;
      })
      .finally(() => {
        this.setState({ loading: false });
      });

    return res;
  }

  addController = () => {
    // if the controller already exists, don't add it
    if (this.props.controllers.indexOf(this.state.newController) !== -1) {
      return;
    }
    const newControllerList = this.props.controllers.concat([
      this.state.newController
    ]);

    const res = this.updateControllerDoc(newControllerList);
    if (res) {
      this.props.updateControllerList(newControllerList);
    }
  };

  onChangeRemoveController = (e) => {
    this.setState({ removeController: e.target.value });
  };

  removeController = () => {
    const removeIndex = this.props.controllers.indexOf(
      this.state.removeController
    );
    const newControllerList = this.props.controllers.slice(); // shallow copy
    newControllerList.splice(removeIndex, 1);

    const res = this.updateControllerDoc(newControllerList);
    if (res) {
      // update the selection so we don't delete same one twice
      this.setState({ removeController: newControllerList[0] });
      this.props.updateControllerList(newControllerList);
    }

    // remove the controller from local storage
    const controller = localStorage.getItem('last_login_url');
    if (controller === this.state.removeController) {
      localStorage.removeItem('last_login_url');
    }
  };

  render() {
    const editButton = (
      <EuiButtonIcon
        color="primary"
        iconType="indexEdit"
        aria-label="Edit Controllers"
        onClick={this.onClickEdit}
      />
    );

    return (
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        justifyContent="center"
      >
        <EuiFormRow label="Select Controller">
          <EuiFlexItem grow={false} style={{ width: '250px' }}>
            <EuiSelect
              options={this.formatControllers()}
              value={this.props.selectedController}
              onChange={this.props.onChangeController}
              isLoading={this.state.loading}
            />
          </EuiFlexItem>
        </EuiFormRow>

        <EuiFlexItem grow={false} style={{ width: '50px' }}>
          <EuiPopover
            className="center"
            button={editButton}
            isOpen={this.state.isPopoverOpen}
            closePopover={this.closePopover}
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFieldText
                  value={this.state.newController}
                  placeholder="Add Controller URL"
                  onChange={this.onChangeNewController}
                  isLoading={this.state.loading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={this.addController}>
                  Add
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiSelect
                  options={this.formatControllers()}
                  value={this.state.removeController}
                  onChange={this.onChangeRemoveController}
                  isLoading={this.state.loading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={this.removeController}>
                  Remove
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
