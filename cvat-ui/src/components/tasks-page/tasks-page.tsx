import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Spin,
    Button,
    message,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import {
    TasksQuery,
} from '../../reducers/interfaces';

import TopBar from './top-bar';
import FeedbackComponent from '../feedback';
import EmptyListComponent from './empty-list';
import TaskListContainer from '../../containers/tasks-page/tasks-list';

interface TasksPageProps {
    tasksFetching: boolean;
    gettingQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
    numberOfHiddenTasks: number;
    onGetTasks: (gettingQuery: TasksQuery) => void;
    hideEmptyTasks: (hideEmpty: boolean) => void;
}

function getSearchField(gettingQuery: TasksQuery): string {
    let searchString = '';
    for (const field of Object.keys(gettingQuery)) {
        if (gettingQuery[field] !== null && field !== 'page') {
            if (field === 'search') {
                return (gettingQuery[field] as any) as string;
            }

            // not constant condition
            // eslint-disable-next-line
            if (typeof (gettingQuery[field] === 'number')) {
                searchString += `${field}:${gettingQuery[field]} AND `;
            } else {
                searchString += `${field}:"${gettingQuery[field]}" AND `;
            }
        }
    }

    return searchString.slice(0, -5);
}

function updateQuery(previousQuery: TasksQuery, searchString: string): TasksQuery {
    const params = new URLSearchParams(searchString);
    const query = { ...previousQuery };
    for (const field of Object.keys(query)) {
        if (params.has(field)) {
            const value = params.get(field);
            if (value) {
                if (field === 'id' || field === 'page') {
                    if (Number.isInteger(+value)) {
                        query[field] = +value;
                    }
                } else {
                    query[field] = value;
                }
            }
        } else if (field === 'page') {
            query[field] = 1;
        } else {
            query[field] = null;
        }
    }

    return query;
}

class TasksPageComponent extends React.PureComponent<TasksPageProps & RouteComponentProps> {
    public componentDidMount(): void {
        const {
            gettingQuery,
            location,
            onGetTasks,
        } = this.props;

        const query = updateQuery(gettingQuery, location.search);
        onGetTasks(query);
    }

    public componentDidUpdate(prevProps: TasksPageProps & RouteComponentProps): void {
        const {
            location,
            gettingQuery,
            onGetTasks,
            numberOfHiddenTasks,
            hideEmptyTasks,
        } = this.props;

        if (prevProps.location.search !== location.search) {
            // get new tasks if any query changes
            const query = updateQuery(gettingQuery, location.search);
            message.destroy();
            onGetTasks(query);
            return;
        }

        if (numberOfHiddenTasks) {
            message.destroy();
            message.info(
                <>
                    <Text>
                        Some tasks have not been showed because they do not have any data.
                    </Text>
                    <Button
                        type='link'
                        onClick={(): void => {
                            hideEmptyTasks(false);
                            message.destroy();
                        }}
                    >
                        Show all
                    </Button>
                </>, 7,
            );
        }
    }

    private handleSearch = (value: string): void => {
        const {
            gettingQuery,
        } = this.props;

        const query = { ...gettingQuery };
        const search = value.replace(/\s+/g, ' ').replace(/\s*:+\s*/g, ':').trim();

        const fields = ['name', 'mode', 'owner', 'assignee', 'status', 'id'];
        for (const field of fields) {
            query[field] = null;
        }
        query.search = null;

        let specificRequest = false;
        for (const param of search.split(/[\s]+and[\s]+|[\s]+AND[\s]+/)) {
            if (param.includes(':')) {
                const [field, fieldValue] = param.split(':');
                if (fields.includes(field) && !!fieldValue) {
                    specificRequest = true;
                    if (field === 'id') {
                        if (Number.isInteger(+fieldValue)) {
                            query[field] = +fieldValue;
                        }
                    } else {
                        query[field] = fieldValue;
                    }
                }
            }
        }

        query.page = 1;
        if (!specificRequest && value) { // only id
            query.search = value;
        }

        this.updateURL(query);
    };

    private handlePagination = (page: number): void => {
        const {
            gettingQuery,
        } = this.props;

        // modify query object
        const query = { ...gettingQuery };
        query.page = page;

        // update url according to new query object
        this.updateURL(query);
    };

    private updateURL(gettingQuery: TasksQuery): void {
        const { history } = this.props;
        let queryString = '?';
        for (const field of Object.keys(gettingQuery)) {
            if (gettingQuery[field] !== null) {
                queryString += `${field}=${gettingQuery[field]}&`;
            }
        }

        const oldQueryString = history.location.search;
        if (oldQueryString !== queryString) {
            history.push({
                search: queryString.slice(0, -1),
            });

            // force update if any changes
            this.forceUpdate();
        }
    }

    public render(): JSX.Element {
        const {
            tasksFetching,
            gettingQuery,
            numberOfVisibleTasks,
        } = this.props;

        if (tasksFetching) {
            return (
                <Spin size='large' style={{ margin: '25% 45%' }} />
            );
        }

        return (
            <div className='cvat-tasks-page'>
                <TopBar
                    onSearch={this.handleSearch}
                    searchValue={getSearchField(gettingQuery)}
                />
                {numberOfVisibleTasks
                    ? (
                        <TaskListContainer
                            onSwitchPage={this.handlePagination}
                        />
                    ) : <EmptyListComponent />
                }
                <FeedbackComponent />
            </div>
        );
    }
}

export default withRouter(TasksPageComponent);
