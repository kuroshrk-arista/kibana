import React, { Fragment } from 'react';
import { filter, find, isEmpty } from 'lodash';
import { getLatexFromExpr } from '../../common/utils/HealthScore';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const axios = require('axios');

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFormRow,
  EuiTextArea,
  EuiComboBox,
  EuiButtonGroup,
  htmlIdGenerator
} from '@elastic/eui';

export class ScoringPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      exprNetworkEdit: '', // Holds the 'data' of the selection, and allows it to be edited
      exprEndpointEdit: '',
      exprNetworkLatex: '',
      exprEndpointLatex: '',
      exprNetworkValid: false,
      exprEndpointValid: false,
      loading: false,
      exprNetworkSelection: [], // it's an array of selections, but we only allow 1 entry
      exprNetworkOptions: [],
      exprNetworkDefault: [],
      exprEndpointSelection: [], // it's an array of selections, but we only allow 1 entry
      exprEndpointOptions: [],
      exprEndpointDefault: [],
      selectedExprType: this.props.exprType,
      exprTypes: [
        {
          id: 'exprNetwork',
          label: 'Network Scoring'
        },
        {
          id: 'exprEndpoint',
          label: 'Endpoint Scoring'
        }
      ]
    };
  }

  componentDidMount() {
    this.getExpressionConfig('exprNetwork');
    this.getExpressionConfig('exprEndpoint');
  }

  getExpressionConfig = (name) => {
    this.setState({ loading: true });

    // Get the current config for expressions if it exists
    this.props.controller
      .getDocElastic(name)
      .then((res) => {
        if (res.data.results.body) {
          if (res.data.results.body.found) {
            const expressions = res.data.results.body._source.expressions;
            const defaultExpression = res.data.results.body._source.default;
            this.setState({
              [name + 'Options']: expressions,
              [name + 'Selection']: defaultExpression, // since it must be an array
              [name + 'Default']: defaultExpression,
              [name + 'Edit']: defaultExpression[0]
                ? defaultExpression[0].data
                : '' // to display text of the expression
            });

            // display Tex of the first time expressions load, if a default exists
            if (defaultExpression[0]) {
              this.tryToGetLatex(defaultExpression[0].data, name);
              // in the case that a parent needs to be updated with the default
              // selection, run this function.
              this.props.onChangeExpr(defaultExpression[0].data, name);
            }
          } else {
            // console.log(res);
            // console.log('No config file exists');
          }
        }
      })
      .catch((err) => {
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  getSuccessToastProps(operation) {
    let verb = operation === 'delete' ? 'deleted' : 'saved';
    let icon = operation === 'delete' ? 'trash' : 'save';

    return {
      id: htmlIdGenerator()('expressions-update-success'),
      title: 'Expression ' + verb + ' successfully',
      color: 'success',
      iconType: icon,
      text: ''
    };
  }

  getErrorToastProps(operation) {
    let verb = operation === 'delete' ? 'deleted' : 'saved';
    let icon = operation === 'delete' ? 'trash' : 'save';

    return {
      id: htmlIdGenerator()('expressions-update-error'),
      title: 'Error ' + verb + ' expression',
      color: 'danger',
      iconType: 'alert',
      text: <p>Expression could not be {verb}</p>
    };
  }

  updateExpressionConfig = (type, operation, deleteLabel) => {
    this.setState({ loading: true });

    const doc = {
      expressions: this.state[type + 'Options'],
      default: this.state[type + 'Default']
    };

    if (operation === 'delete') {
      const defaultExpressionLabel = doc.default && doc.default[0].label;

      if (defaultExpressionLabel === deleteLabel) {
        doc.default = [];
      }
    }

    this.props.controller
      .putDocElastic(type, doc)
      .then((res) => {
        if (res.data.results.body) {
          // if one or more shards have it, it's successful
          if (res.data.results.body._shards.successful > 0) {
            const successToast = this.getSuccessToastProps(operation);

            this.props.displayToasts([successToast]);
          } else {
            const errToast = this.getErrorToastProps(operation);

            this.props.displayToasts([errToast]);

            return false;
          }
        }
      })
      .catch((err) => {
        const errToast = this.getErrorToastProps(operation);

        this.props.displayToasts([errToast]);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  onChangeExpr = (e) => {
    this.setState({ [e.target.name + 'Edit']: e.target.value });

    this.tryToGetLatex(e.target.value, e.target.name);
  };

  // When the button is clicked to submit/edit the expression, apply the new value
  // to only the selected option, then update ES
  onEditExprNetwork = () => {
    const label = this.state.exprNetworkSelection[0]
      ? this.state.exprNetworkSelection[0].label
      : '';
    this.setState(
      (prevState) => ({
        exprNetworkOptions: prevState.exprNetworkOptions.map((option) =>
          option.label === label
            ? { ...option, data: this.state.exprNetworkEdit || '' }
            : option
        )
      }),
      () => {
        this.updateExpressionConfig('exprNetwork', 'save'); // update ES after setting state
      }
    );
  };

  onDeleteExprNetwork = () => {
    const label = this.state.exprNetworkSelection[0]
      ? this.state.exprNetworkSelection[0].label
      : '';
    this.setState(
      (prevState) => ({
        exprNetworkOptions: filter(prevState.exprNetworkOptions, (option) =>
          option.label !== label
        ),
        exprNetworkSelection: [],
        exprNetworkEdit: ''
      }),
      () => {
        this.updateExpressionConfig('exprNetwork', 'delete', label); // update ES after setting state
      }
    );
  };

  onSetDefaultExprNetwork = () => {
    const label = this.state.exprNetworkSelection[0]
      ? this.state.exprNetworkSelection[0].label
      : '';
    const expression = filter(this.state.exprNetworkOptions, (option) =>
      option.label === label
    );
    if (! isEmpty(expression)) {
      this.setState(
        (prevState) => ({
          exprNetworkDefault: [expression[0]]
        }),
        () => {
          this.updateExpressionConfig('exprNetwork', 'save'); // update ES after setting state
        }
      );
    }
  };

  onEditExprEndpoint = () => {
    const label = this.state.exprEndpointSelection[0]
      ? this.state.exprEndpointSelection[0].label
      : '';
    this.setState(
      (prevState) => ({
        exprEndpointOptions: prevState.exprEndpointOptions.map((option) =>
          option.label === label
            ? { ...option, data: this.state.exprEndpointEdit || '' }
            : option
        )
      }),
      () => {
        this.updateExpressionConfig('exprEndpoint', 'save'); // update ES after setting state
      }
    );
  };

  onDeleteExprEndpoint = () => {
    const label = this.state.exprEndpointSelection[0]
      ? this.state.exprEndpointSelection[0].label
      : '';
    this.setState(
      (prevState) => ({
        exprEndpointOptions: filter(prevState.exprEndpointOptions, (option) =>
          option.label !== label
        ),
        exprEndpointSelection: [],
        exprEndpointEdit: ''
      }),
      () => {
        this.updateExpressionConfig('exprEndpoint', 'delete', label); // update ES after setting state
      }
    );
  };

  onSetDefaultExprEndpoint = () => {
    const label = this.state.exprEndpointSelection[0]
      ? this.state.exprEndpointSelection[0].label
      : '';
    const expression = filter(this.state.exprEndpointOptions, (option) =>
      option.label === label
    );
    if (! isEmpty(expression)) {
      this.setState(
        (prevState) => ({
          exprEndpointDefault: [expression[0]]
        }),
        () => {
          this.updateExpressionConfig('exprEndpoint', 'save'); // update ES after setting state
        }
      );
    }
  };

  // Update the corresponding selection and add its data to the Edit variable
  // So the user can change the text without changing the value (until submitting)
  updateSelectionNetwork = (selection) => {
    const data = typeof selection[0] !== 'undefined' ? selection[0].data : '';
    this.setState({
      exprNetworkSelection: selection,
      exprNetworkEdit: data // in case no selection exists, set to empty
    });

    this.tryToGetLatex(data, 'exprNetwork');

    if (this.props.renderSelectionOnly) {
      // Only update scoring in parent if it is being used for that
      // Thus don't update scores when just editing the scoring expressions
      this.props.onChangeExpr(data, 'exprNetwork');
    }
  };

  updateSelectionEndpoint = (selection) => {
    const data = typeof selection[0] !== 'undefined' ? selection[0].data : '';
    this.setState({
      exprEndpointSelection: selection,
      exprEndpointEdit: data // in case no selection exists, set to empty
    });

    this.tryToGetLatex(data, 'exprEndpoint');

    if (this.props.renderSelectionOnly) {
      // Only update scoring in parent if it is being used for that
      // Thus don't update scores when just editing the scoring expressions
      this.props.onChangeExpr(data, 'exprEndpoint');
    }
  };

  // Convert the text from the TextArea to latex while the user is typing
  // Since while they type not every string will be valid latex, we catch
  // the parsing error and only update the latex when it's valid
  // name == one of exprNetwork, exprEndpoint
  tryToGetLatex = (expr, name) => {
    const res = getLatexFromExpr(expr);
    // if there was no error thrown in converting
    if (res !== null) {
      this.setState({ [name + 'Latex']: res, [name + 'Valid']: true });
    } else {
      this.setState({ [name + 'Valid']: false });
    }
  };

  checkDuplicate(options, value) {
    const duplicate = find(options, { label: value });
    return ! isEmpty(duplicate);
  }

  onCreateOptionNetwork = (value) => {
    if (this.checkDuplicate(this.state.exprNetworkOptions, value)) {
      this.setState({ exprNetworkValid: false });
      return false;
    }

    const newOption = {
      label: value,
      data: 'default=0'
    };
    this.setState((prevState) => ({
      exprNetworkOptions: prevState.exprNetworkOptions.concat(newOption)
    }));
  };

  onCreateOptionEndpoint = (value) => {
    if (this.checkDuplicate(this.state.exprEndpointOptions, value)) {
      this.setState({ exprEndpointValid: false });
      return false;
    }

    const newOption = {
      label: value,
      data: 'default=0'
    };
    this.setState((prevState) => ({
      exprEndpointOptions: prevState.exprEndpointOptions.concat(newOption)
    }));
  };

  // Checks to see if user is allowed to submit/edit an expression
  // First checks if the Tex was valid, then if the formula is non-empty, then if label exists and is nonempty.
  isNetworkExpressionValid = () => {
    return (
      this.state.exprNetworkValid &&
      this.state.exprNetworkEdit.length > 0 &&
      this.state.exprNetworkSelection[0] &&
      this.state.exprNetworkSelection[0].label.length > 0
    );
  };

  isEndpointExpressionValid = () => {
    return (
      this.state.exprEndpointValid &&
      this.state.exprEndpointEdit.length > 0 &&
      this.state.exprEndpointSelection[0] &&
      this.state.exprEndpointSelection[0].label.length > 0
    );
  };

  onChangeExprType = (selectedExprType) => {
    this.setState({ selectedExprType });
  };

  // Renders only the ComboBox for selection
  renderSelectionOnly() {
    const { exprType } = this.props;

    if (exprType === 'exprNetwork') {
      const { exprNetworkOptions, exprNetworkSelection } = this.state;
      return (
        <EuiComboBox
          placeholder="Select an expression"
          singleSelection={{ asPlainText: true }}
          options={exprNetworkOptions}
          selectedOptions={exprNetworkSelection}
          onChange={this.updateSelectionNetwork}
          isClearable={false}
          isInvalid={isEmpty(exprNetworkSelection)}
        />
      );
    }

    // if the exprType === 'exprEndpoint'
    const { exprEndpointOptions, exprEndpointSelection } = this.state;
    return (
      <EuiComboBox
        placeholder="Select an expression"
        singleSelection={{ asPlainText: true }}
        options={exprEndpointOptions}
        selectedOptions={exprEndpointSelection}
        onChange={this.updateSelectionEndpoint}
        isClearable={false}
        isInvalid={isEmpty(exprEndpointSelection)}
      />
    );
  }

  renderConfigPage() {
    if (this.state.selectedExprType === 'exprNetwork') {
      return (
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          alignItems="center"
          justifyContent="center"
        >
          <EuiFlexItem>
            <EuiButtonGroup
              color="primary"
              options={this.state.exprTypes}
              idSelected={this.state.selectedExprType}
              onChange={this.onChangeExprType}
            />
          </EuiFlexItem>
          <EuiFlexItem className="form-container">
            <EuiFormRow fullWidth={true} label="Expression Name">
              <EuiComboBox
                placeholder="Select an expression or create a new one"
                singleSelection={{ asPlainText: true }}
                options={this.state.exprNetworkOptions}
                onCreateOption={this.onCreateOptionNetwork}
                selectedOptions={this.state.exprNetworkSelection}
                onChange={this.updateSelectionNetwork}
              />
            </EuiFormRow>
            <EuiFormRow fullWidth={true} label="Network Health Expression">
              <EuiTextArea
                placeholder="Enter custom expression for scoring"
                value={this.state.exprNetworkEdit}
                onChange={this.onChangeExpr}
                fullWidth={true}
                rows={4}
                name="exprNetwork"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem className="form-container latex-container">
            <BlockMath>{this.state.exprNetworkLatex}</BlockMath>
          </EuiFlexItem>
          <EuiFlexItem className="form-container">
            <EuiFlexGroup>
              <EuiFlexItem>{this.props.returnButton}</EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  onClick={this.onEditExprNetwork}
                  isDisabled={!this.isNetworkExpressionValid()}
                  isLoading={this.state.loading}
                >
                  Save
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  onClick={this.onDeleteExprNetwork}
                  isDisabled={!this.isNetworkExpressionValid()}
                  isLoading={this.state.loading}
                >
                  Delete
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  onClick={this.onSetDefaultExprNetwork}
                  isDisabled={!this.isNetworkExpressionValid()}
                  isLoading={this.state.loading}
                >
                  Set as Default
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // if we are only showing endpoint
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        alignItems="center"
        justifyContent="center"
      >
        <EuiFlexItem>
          <EuiButtonGroup
            color="primary"
            options={this.state.exprTypes}
            idSelected={this.state.selectedExprType}
            onChange={this.onChangeExprType}
          />
        </EuiFlexItem>
        <EuiFlexItem className="form-container">
          <EuiFormRow fullWidth={true} label="Expression Name">
            <EuiComboBox
              placeholder="Select an expression or create a new one"
              singleSelection={{ asPlainText: true }}
              options={this.state.exprEndpointOptions}
              onCreateOption={this.onCreateOptionEndpoint}
              selectedOptions={this.state.exprEndpointSelection}
              onChange={this.updateSelectionEndpoint}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth={true} label="Endpoint Health Expression">
            <EuiTextArea
              placeholder="Enter custom expression for scoring"
              value={this.state.exprEndpointEdit}
              onChange={this.onChangeExpr}
              fullWidth={true}
              rows={4}
              name="exprEndpoint"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem className="form-container latex-container">
          <BlockMath>{this.state.exprEndpointLatex}</BlockMath>
        </EuiFlexItem>
        <EuiFlexItem className="form-container">
          <EuiFlexGroup>
            <EuiFlexItem>{this.props.returnButton}</EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                onClick={this.onEditExprEndpoint}
                isDisabled={!this.isEndpointExpressionValid()}
                isLoading={this.state.loading}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                onClick={this.onDeleteExprEndpoint}
                isDisabled={!this.isEndpointExpressionValid()}
                isLoading={this.state.loading}
              >
                Delete
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                onClick={this.onSetDefaultExprEndpoint}
                isDisabled={!this.isEndpointExpressionValid()}
                isLoading={this.state.loading}
              >
                Set as Default
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    if (this.props.renderSelectionOnly) {
      return this.renderSelectionOnly();
    }

    // Else render the whole page
    return this.renderConfigPage();
  }
}
