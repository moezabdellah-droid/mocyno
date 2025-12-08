import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import moment from 'moment';


const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica'
    },
    badgePage: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica'
    },
    badgeWrapper: {
        width: '85.6mm',
        height: '54mm',
        border: '1px solid #ddd',
        borderRadius: 8,
        overflow: 'hidden',
        margin: 10,
        backgroundColor: '#fff',
        position: 'relative'
    },
    badgeFront: {
        width: '100%',
        height: '100%',
        flexDirection: 'row'
    },
    badgeBack: {
        width: '100%',
        height: '100%',
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    badgeHeaderRed: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 12,
        backgroundColor: '#CD1A20'
    },
    badgePhotoContainer: {
        width: '35%',
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20
    },
    badgePhoto: {
        width: 60,
        height: 70,
        borderRadius: 4,
        objectFit: 'cover',
        border: '1px solid #ccc'
    },
    badgeInfoContainer: {
        width: '65%',
        padding: 8,
        paddingTop: 20,
        justifyContent: 'flex-start'
    },
    badgeName: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    badgeFirstName: {
        fontSize: 10,
        marginBottom: 4
    },
    badgeLabel: {
        fontSize: 6,
        color: '#666',
        textTransform: 'uppercase',
        marginTop: 4
    },
    badgeValue: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000'
    },
    badgeValueRed: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#CD1A20'
    },
    badgeBackText: {
        fontSize: 7,
        textAlign: 'center',
        marginBottom: 4,
        color: '#333'
    },
    badgeLegalTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
        textTransform: 'uppercase'
    },
    badgeLegalSmall: {
        fontSize: 5,
        textAlign: 'center',
        color: '#666',
        marginTop: 5,
        fontStyle: 'italic'
    },
    header: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        color: '#CD1A20',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    section: {
        margin: 10,
        padding: 10,
        borderBottom: '1px solid #eee'
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333'
    },
    fieldLabel: {
        fontSize: 10,
        color: '#666',
        width: 150
    },
    fieldValue: {
        fontSize: 11,
        color: '#000',
        flex: 1
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4
    }
});

interface AgentPdfProps {
    agent: unknown;
    photoBase64?: string | null;
    logoBase64?: string | null;
}

export const AgentBadgePdf = ({ agent, photoBase64, logoBase64 }: AgentPdfProps) => {
    if (!agent) return <Document><Page><Text>No Data</Text></Page></Document>;

    const photoSrc = photoBase64 || agent.photoURL;

    return (
        <Document>
            <Page size="A4" style={styles.badgePage}>

                {/* RECTO (FRONT) */}
                <View style={styles.badgeWrapper}>
                    {logoBase64 && (
                        <Image src={logoBase64} style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 140,
                            height: 140,
                            opacity: 0.08,
                            zIndex: -1
                        }} />
                    )}

                    <View style={styles.badgeHeaderRed} />
                    <View style={styles.badgeFront}>
                        <View style={styles.badgePhotoContainer}>
                            {photoSrc ? (
                                <Image src={photoSrc} style={styles.badgePhoto} />
                            ) : (
                                <View style={{ ...styles.badgePhoto, backgroundColor: '#eee' }} />
                            )}
                        </View>
                        <View style={styles.badgeInfoContainer}>
                            <Text style={styles.badgeName}>{agent.lastName}</Text>
                            <Text style={styles.badgeFirstName}>{agent.firstName}</Text>

                            <Text style={styles.badgeLabel}>Né(e) le</Text>
                            <Text style={styles.badgeValue}>{agent.birthDate ? moment(agent.birthDate).format('DD/MM/YYYY') : 'N/A'}</Text>

                            <Text style={styles.badgeLabel}>N° Carte Pro</Text>
                            <Text style={styles.badgeValueRed}>{agent.professionalCardNumber || 'N/A'}</Text>

                            <Text style={styles.badgeLabel}>Activités</Text>
                            <Text style={styles.badgeValue} wrap={false}>
                                {agent.specialties?.join(', ') || 'Surveillance Humaine'}
                            </Text>

                            {agent.specialties?.includes('CYNO') && agent.dogIds && (
                                <>
                                    <Text style={styles.badgeLabel}>Numéros Chiens</Text>
                                    <Text style={{ ...styles.badgeValue, fontSize: 6 }}>{agent.dogIds}</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* VERSO (BACK) */}
                <View style={styles.badgeWrapper}>
                    {logoBase64 && (
                        <Image src={logoBase64} style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 140,
                            height: 140,
                            opacity: 0.15,
                            zIndex: -1
                        }} />
                    )}

                    <View style={styles.badgeBack}>
                        <Text style={styles.badgeLegalTitle}>MO'CYNO - Agence de Sécurité Privée</Text>
                        <Text style={styles.badgeBackText}>SASU au capital social de 1000€</Text>
                        <Text style={styles.badgeBackText}>SIRET 990 179 566 00015 — NAF 80.10Z</Text>

                        <Text style={{ ...styles.badgeBackText, marginTop: 5 }}>31 Rue Chevalier Paul</Text>
                        <Text style={styles.badgeBackText}>83000 TOULON, FRANCE</Text>

                        <Text style={{ ...styles.badgeBackText, marginTop: 10, fontWeight: 'bold' }}>
                            Autorisation CNAPS : AUT-83-2124-09-09-20250998415
                        </Text>

                        <Text style={styles.badgeLegalSmall}>
                            "L'autorisation d'exercice ne confère aucune prérogative de puissance publique à l'entreprise ou aux personnes qui en bénéficient."
                        </Text>
                        <Text style={styles.badgeLegalSmall}>
                            (Article 7 de la loi n° 83-629 du 12 juillet 1983)
                        </Text>
                    </View>
                </View>

            </Page>
        </Document>
    )
};

export const AgentProfilePdf = ({ agent, photoBase64 }: AgentPdfProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Fiche de Renseignements Agent</Text>

            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                {(photoBase64 || agent.photoURL) ? (
                    <Image src={photoBase64 || agent.photoURL} style={{ width: 100, height: 100, borderRadius: 5, marginRight: 20, objectFit: 'cover' }} />
                ) : null}
                <View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{agent.firstName} {agent.lastName}</Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>{agent.role} - {agent.status}</Text>
                    <Text style={{ fontSize: 12, marginTop: 5 }}>Matricule: {agent.matricule}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>État Civil</Text>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Date de Naissance:</Text>
                    <Text style={styles.fieldValue}>{agent.birthDate ? moment(agent.birthDate).format('DD/MM/YYYY') : '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Lieu de Naissance:</Text>
                    <Text style={styles.fieldValue}>{agent.birthPlace || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Nationalité:</Text>
                    <Text style={styles.fieldValue}>{agent.nationality || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Genre:</Text>
                    <Text style={styles.fieldValue}>{agent.gender || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Groupe Sanguin:</Text>
                    <Text style={styles.fieldValue}>{agent.bloodGroup || '-'}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coordonnées</Text>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Adresse:</Text>
                    <Text style={styles.fieldValue}>{agent.address || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Code Postal / Ville:</Text>
                    <Text style={styles.fieldValue}>{agent.zipCode || '-'} {agent.city || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Téléphone:</Text>
                    <Text style={styles.fieldValue}>{agent.phone || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Email:</Text>
                    <Text style={styles.fieldValue}>{agent.email}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Infos Professionnelles</Text>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>N° Carte Pro:</Text>
                    <Text style={styles.fieldValue}>{agent.professionalCardNumber || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Obtention Carte Pro:</Text>
                    <Text style={styles.fieldValue}>{agent.professionalCardObtainedAt ? moment(agent.professionalCardObtainedAt).format('DD/MM/YYYY') : '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>N° SST:</Text>
                    <Text style={styles.fieldValue}>{agent.sstNumber || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Obtention SST:</Text>
                    <Text style={styles.fieldValue}>{agent.sstObtainedAt ? moment(agent.sstObtainedAt).format('DD/MM/YYYY') : '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Expiration SST:</Text>
                    <Text style={styles.fieldValue}>{agent.sstExpiresAt ? moment(agent.sstExpiresAt).format('DD/MM/YYYY') : '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Nature Contrat:</Text>
                    <Text style={styles.fieldValue}>{agent.contractNature || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Spécialités:</Text>
                    <Text style={styles.fieldValue}>{agent.specialties?.join(', ') || '-'}</Text>
                </View>
                {agent.dogIds && (
                    <View style={styles.row}>
                        <Text style={styles.fieldLabel}>Chiens (ID 250...):</Text>
                        <Text style={styles.fieldValue}>{agent.dogIds}</Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Administratif & Bancaire</Text>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>N° Sécurité Sociale:</Text>
                    <Text style={styles.fieldValue}>{agent.socialSecurityNumber || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>Banque:</Text>
                    <Text style={styles.fieldValue}>{agent.bankName || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>IBAN:</Text>
                    <Text style={styles.fieldValue}>{agent.iban || '-'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.fieldLabel}>BIC:</Text>
                    <Text style={styles.fieldValue}>{agent.bic || '-'}</Text>
                </View>
            </View>

        </Page>
    </Document>
);
