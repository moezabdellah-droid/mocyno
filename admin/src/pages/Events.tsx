
import { Datagrid, List, TextField, DateField, FunctionField, Show, SimpleShowLayout } from 'react-admin';
import type { Event } from '../types/models';

export const EventList = () => (
    <List resource="events">
        <Datagrid rowClick="show">
            <TextField source="authorEmail" label="Agent" />
            <DateField source="timestamp" showTime label="Date" />
            <TextField source="status" label="Statut" />
        </Datagrid>
    </List>
);

export const EventShow = () => (
    <Show resource="events">
        <SimpleShowLayout>
            <TextField source="type" variant="h6" />
            <TextField source="title" variant="h4" />
            <DateField source="timestamp" showTime />
            <TextField source="authorEmail" label="Auteur" />
            <TextField source="description" style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }} />

            <FunctionField
                label="Preuve Photo"
                render={(record: Event) => {
                    if (!record.photo) return null;
                    return (
                        <div style={{ marginTop: '20px' }}>
                            <img src={record.photo} alt="Preuve" style={{ maxWidth: '500px', borderRadius: '4px' }} />
                        </div>
                    );
                }}
            />
        </SimpleShowLayout>
    </Show>
);
